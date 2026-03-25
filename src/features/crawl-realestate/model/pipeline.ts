import { chromium } from 'playwright';
import type { RealEstateCrawlConfig, RealEstateCrawlResult, RealEstateBatchResult } from './types';
import { parseCenter, getLegalDivision, collectArticles } from '../lib/naverApi';

/**
 * 네이버 부동산 매물 크롤링 파이프라인
 *
 * 실행 흐름:
 * 1. config.url로 직접 이동 (모든 필터 파라미터 URL에 포함)
 * 2. boundedArticles API 인터셉트 + 커서 페이지네이션으로 전체 매물 수집
 *    - duplicatedArticleInfo.articleInfoList까지 펼쳐서 개별 매물 모두 수집
 * 3. sector 필터 적용 후 반환
 */
export async function runRealEstateCrawl(config: RealEstateCrawlConfig): Promise<RealEstateCrawlResult> {
  const startTime = Date.now();

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

    // 봇 감지 우회
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // 1단계: URL로 이동 + 전체 매물 수집
    const allArticles = await collectArticles(page, config.url);

    // 2단계: 행정구역명 조회 (결과 레이블용)
    const urlObj = new URL(config.url);
    const center = urlObj.searchParams.get('center') ?? '';
    const { lng, lat } = parseCenter(center);
    const division = await getLegalDivision(page, lng, lat);
    const regionName = `${division.cityName} ${division.divisionName}`;

    // 3단계: sector 필터 적용
    const articles = config.sector
      ? allArticles.filter((a) => a.sector === config.sector)
      : allArticles;

    // 4단계: articleUrl 채우기 (articleNumber 기반)
    for (const a of articles) {
      a.articleUrl = `https://fin.land.naver.com/articles/${a.articleNumber}`;
    }

    console.log(`[완료] ${regionName} — 매물 ${articles.length}건`);

    return {
      region: regionName,
      totalArticles: articles.length,
      articles,
      crawledAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } catch (err) {
    return {
      region: '',
      totalArticles: 0,
      articles: [],
      crawledAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: err instanceof Error ? err.message : '알 수 없는 오류',
    };
  } finally {
    await browser.close();
  }
}

/**
 * 여러 지역을 순차 크롤링하는 배치 파이프라인
 * onResult 콜백으로 지역 완료 즉시 후처리 가능
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
    totalArticles: results.reduce((sum, r) => sum + r.totalArticles, 0),
  };
}
