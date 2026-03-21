import { chromium } from 'playwright';
import type { RealEstateCrawlConfig, RealEstateCrawlResult, RealEstateBatchResult, RealEstateArticle } from './types';
import {
  parseCenter,
  getLegalDivision,
  calcBoundingBox,
  getComplexList,
  getComplexDetail,
  getArticleList,
  buildMapParams,
} from '../lib/naverApi';

/**
 * 네이버 부동산 매물 크롤링 파이프라인
 *
 * 실행 흐름:
 * 1. center 좌표 → 행정구역 코드(legalDivisionNumber) + polygon 획득
 * 2. polygon에서 bounding box 계산 → complexClusters API로 단지 목록 수집
 * 3. 단지별: 기본 정보(complex) + 매물 목록(article/list) 동시 수집
 * 4. 단지 정보 + 매물 정보를 합쳐 결과 반환
 *
 * Playwright non-headless + webdriver 속성 제거로 봇 감지 우회
 * page.evaluate()로 실제 브라우저 컨텍스트에서 API 호출 (쿠키/세션 자동 포함)
 */
export async function runRealEstateCrawl(
  config: RealEstateCrawlConfig,
): Promise<RealEstateCrawlResult> {
  const startTime = Date.now();
  const { lng, lat } = parseCenter(config.center);

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // webdriver 속성 제거 (봇 감지 우회)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // 실제 지도 페이지 로드로 세션/쿠키 완전 초기화 (모든 필터 파라미터 포함)
    const mapUrl = `https://fin.land.naver.com/map?${buildMapParams(config, config.center, 11)}`;
    await page.goto(mapUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(4_000);

    // 1단계: 행정구역 코드 + polygon 조회
    const division = await getLegalDivision(page, lng, lat);
    const regionName = `${division.cityName} ${division.divisionName}`;

    if (!division.polygon) {
      return makeErrorResult(regionName, 'polygon 데이터를 받지 못했습니다.', startTime);
    }

    // 2단계: polygon bounding box → 단지 목록 수집
    const bbox = calcBoundingBox(division);
    const clusters = await getComplexList(
      page,
      bbox,
      division.legalDivisionNumber,
      config,
    );

    // 3단계: 단지별 기본 정보 + 매물 목록 순차 수집
    // (각 단지마다 페이지 이동이 발생하므로 순차 처리)
    const articles: RealEstateArticle[] = [];

    for (const cluster of clusters) {
      // 단지 기본 정보는 GET이므로 page.evaluate로 직접 조회 가능
      const detail = await getComplexDetail(page, cluster.complexNumber);
      if (!detail) continue;

      // dongs 필터가 설정된 경우 대상 동 외 단지 제외 (Level 2: sector 정확히 일치)
      if (config.dongs?.length && !config.dongs.includes(detail.address.sector)) continue;

      // 매물 목록은 단지 상세 페이지 이동 + 인터셉트
      const rawArticles = await getArticleList(
        page,
        cluster.complexNumber,
        config,
      );

      console.log(`[INFO] ${detail.name}: 매물 ${rawArticles.length}건`);

      for (const a of rawArticles) {
        articles.push({
          complexNumber: cluster.complexNumber,
          complexName: detail.name,
          ...normalizeAddress(detail.address.city, detail.address.division),
          sector: detail.address.sector,
          totalHouseholdNumber: detail.totalHouseholdNumber,
          useApprovalDate: detail.useApprovalDate,
          floorAreaRatio: detail.floorAreaRatio,
          buildingCoverageRatio: detail.buildingCoverageRatio,
          articleNumber: a.articleNumber,
          articleUrl: `https://fin.land.naver.com/complexes/${cluster.complexNumber}/articles/${a.articleNumber}`,
          dongName: a.dongName,
          floor: a.floor,
          totalFloor: a.totalFloor,
          direction: a.direction,
          supplySpace: a.supplySpace,
          exclusiveSpace: a.exclusiveSpace,
          dealPrice: a.dealPrice,
        });
      }
    }

    return {
      region: regionName,
      totalComplexes: clusters.length,
      totalArticles: articles.length,
      articles,
      crawledAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } catch (err) {
    return makeErrorResult(
      '',
      err instanceof Error ? err.message : '알 수 없는 오류',
      startTime,
    );
  } finally {
    await browser.close();
  }
}

/**
 * 여러 지역 설정을 순차적으로 크롤링하는 배치 파이프라인
 * 각 지역마다 브라우저를 새로 열어 봇 감지 리스크 최소화
 * onResult 콜백으로 지역 완료 즉시 후처리(시트 저장 등) 가능
 */
export async function runRealEstateCrawlBatch(
  configs: RealEstateCrawlConfig[],
  onResult?: (result: RealEstateCrawlResult, index: number) => Promise<void>,
): Promise<RealEstateBatchResult> {
  const results: RealEstateCrawlResult[] = [];

  for (let i = 0; i < configs.length; i++) {
    console.log(`\n[배치 ${i + 1}/${configs.length}] 크롤링 시작`);
    const result = await runRealEstateCrawl(configs[i]);
    results.push(result);

    if (onResult) {
      await onResult(result, i);
    }
  }

  return {
    results,
    totalComplexes: results.reduce((sum, r) => sum + r.totalComplexes, 0),
    totalArticles: results.reduce((sum, r) => sum + r.totalArticles, 0),
  };
}

/**
 * 도/시 + 구 주소를 정규화
 * 경기도처럼 division에 '시 구' 형태가 오는 경우 시를 city로 올림
 * 예: ("경기도", "부천시 원미구") → { city: "경기도 부천시", division: "원미구" }
 *     ("서울시",  "서대문구")      → { city: "서울시",       division: "서대문구" } (변경 없음)
 */
function normalizeAddress(city: string, division: string): { city: string; division: string } {
  const parts = division.trim().split(/\s+/);
  if (parts.length >= 2 && (parts[0].endsWith('시') || parts[0].endsWith('군'))) {
    return { city: `${city} ${parts[0]}`, division: parts.slice(1).join(' ') };
  }
  return { city, division };
}

function makeErrorResult(
  region: string,
  error: string,
  startTime: number,
): RealEstateCrawlResult {
  return {
    region,
    totalComplexes: 0,
    totalArticles: 0,
    articles: [],
    crawledAt: new Date().toISOString(),
    duration: Date.now() - startTime,
    error,
  };
}
