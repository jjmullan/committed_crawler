import type { Page } from 'playwright';
import { NAVER_LAND_API, DEFAULT_FILTER } from '../config/realestate';
import type { LegalDivision, BoundingBox, ComplexCluster, ComplexDetail, RealEstateCrawlConfig } from '../model/types';
import { DIRECTION_MAP } from '../config/realestate';

/**
 * center 파라미터(경도-위도 문자열)를 좌표 객체로 파싱
 * 예: "126.936-37.579" → { lng: 126.936, lat: 37.579 }
 */
export function parseCenter(center: string): { lng: number; lat: number } {
  const [lng, lat] = center.split('-').map(Number);
  return { lng, lat };
}

/**
 * min/max가 선택적인 범위 객체를 'min-max' 쿼리 문자열로 변환
 * min 미설정 시 0, max 미설정 시 Infinity로 치환
 * 예: { min: 100, max: 600 } → '100-600'
 *     { min: 100 }          → '100-Infinity'
 *     { max: 600 }          → '0-600'
 *     {}                    → '0-Infinity'
 */
/**
 * min/max 둘 다 없으면 null 반환 → 쿼리스트링에서 제외
 * min 만 없으면 0, max 만 없으면 Infinity로 치환
 */
function toRangeParam(range: { min?: number; max?: number }): string | null {
  if (range.min === undefined && range.max === undefined) return null;
  return `${range.min ?? 0}-${range.max ?? Infinity}`;
}

/**
 * RealEstateCrawlConfig의 필터 파라미터만 쿼리 문자열로 변환 (center, zoom 제외)
 * 단지 목록 URL, 매물 URL 등 여러 곳에서 재사용
 */
export function buildFilterParams(config: RealEstateCrawlConfig): string {
  const parts: string[] = [`tradeTypes=${config.tradeTypes.join(',')}`, `realEstateTypes=${config.realEstateTypes.join(',')}`];
  const dealPriceParam = toRangeParam(config.dealPrice);
  if (dealPriceParam !== null) parts.push(`dealPrice=${dealPriceParam}`);
  if (config.space) {
    const p = toRangeParam(config.space);
    if (p !== null) parts.push(`space=${p}`);
  }
  if (config.householdNumber) {
    const p = toRangeParam(config.householdNumber);
    if (p !== null) parts.push(`householdNumber=${p}`);
  }
  if (config.subwayWalkingMinute) parts.push(`subwayWalkingMinute=${config.subwayWalkingMinute}`);
  if (config.approvalElapsedYear) {
    const p = toRangeParam(config.approvalElapsedYear);
    if (p !== null) parts.push(`approvalElapsedYear=${p}`);
  }
  if (config.exclusiveSpaceMode) parts.push('filtersExclusiveSpace=true');
  return parts.join('&');
}

/**
 * buildFilterParams에 center, zoom을 추가한 지도 URL 파라미터 빌더
 */
export function buildMapParams(config: RealEstateCrawlConfig, center: string, zoom: number): string {
  return `${buildFilterParams(config)}&center=${center}&zoom=${zoom}`;
}

/**
 * polygon 좌표에서 bounding box 계산
 */
export function calcBoundingBox(division: LegalDivision): BoundingBox {
  const polygon = division.polygon;
  if (!polygon) throw new Error('polygon 데이터가 없습니다.');

  const allCoords = polygon.coordinates.flatMap((c) => c.coordinates).flatMap((c) => c.coordinates);

  return {
    left: Math.min(...allCoords.map((c) => c.x)),
    right: Math.max(...allCoords.map((c) => c.x)),
    top: Math.max(...allCoords.map((c) => c.y)),
    bottom: Math.min(...allCoords.map((c) => c.y)),
  };
}

/**
 * 브라우저 컨텍스트에서 GET 요청 실행 (쿠키/세션 자동 포함)
 */
async function pageGet(page: Page, url: string): Promise<unknown> {
  return page.evaluate(async (reqUrl: string) => {
    const res = await fetch(reqUrl);
    return res.json();
  }, url);
}

/**
 * center 좌표 → 행정구역 정보 조회 (polygon 포함)
 * GUN(구/시) 단위로 조회
 */
export async function getLegalDivision(page: Page, lng: number, lat: number): Promise<LegalDivision> {
  const url = `${NAVER_LAND_API}/legalDivision/searchByCoordinate?longitude=${lng}&latitude=${lat}&type=GUN&needsPolygon=true`;
  const data = (await pageGet(page, url)) as { isSuccess: boolean; detailCode?: string; result: LegalDivision };

  if (!data.isSuccess || !data.result) {
    throw new Error(`행정구역 조회 실패: ${data.detailCode ?? JSON.stringify(data)}`);
  }

  return data.result;
}

/** 동(EUP) 정보 */
export interface EupDivision {
  legalDivisionNumber: string;
  legalDivisionName: string;
  coordinates: { xCoordinate: number; yCoordinate: number };
}

/**
 * bounding box 내 동(EUP) 목록 조회
 */
export async function getEupList(page: Page, bbox: BoundingBox): Promise<EupDivision[]> {
  const url = `${NAVER_LAND_API}/legalDivision/searchByBoundingBox`;
  const body = { boundingBox: bbox, legalDivisionType: 'EUP' };

  const data = (await page.evaluate(
    async ({ reqUrl, reqBody }: { reqUrl: string; reqBody: string }) => {
      const res = await fetch(reqUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: reqBody,
        credentials: 'include',
      });
      return res.json();
    },
    { reqUrl: url, reqBody: JSON.stringify(body) },
  )) as { isSuccess: boolean; result?: EupDivision[] };

  return data.result ?? [];
}

/**
 * zoom=14 URL로 페이지 이동 후 complexClusters 응답 인터셉트로 단지 목록 수집
 * 직접 fetch 호출은 서버에서 차단(HTTP 400)되므로 브라우저 자동 요청 방식 사용
 */
async function interceptComplexClusters(page: Page, lng: number, lat: number, config: RealEstateCrawlConfig): Promise<ComplexCluster[]> {
  const clusters: ComplexCluster[] = [];

  const handler = async (res: import('playwright').Response) => {
    if (!res.url().includes('complex/complexClusters')) return;
    try {
      const data = (await res.json()) as { result?: { clusters?: ComplexCluster[] } };
      if (data.result?.clusters) {
        for (const c of data.result.clusters) clusters.push(c);
      }
    } catch {
      /* 파싱 실패 무시 */
    }
  };

  page.on('response', handler);

  // zoom=14: 동 단위 크기로 단지가 클러스터 없이 개별 표시됨
  const url = `https://fin.land.naver.com/map?${buildMapParams(config, `${lng}-${lat}`, 14)}`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.waitForTimeout(3_000);

  page.off('response', handler);

  return clusters;
}

/**
 * 구(GUN) 전체 단지 목록 수집
 * 구 내 동(EUP) 목록 조회 → 각 동 좌표로 zoom=14 이동 → complexClusters 인터셉트 → 중복 제거
 */
export async function getComplexList(page: Page, bbox: BoundingBox, gunNumber: string, config: RealEstateCrawlConfig): Promise<ComplexCluster[]> {
  // 1. 구 내 동 목록 조회
  const eupList = await getEupList(page, bbox);

  // 구 코드 prefix(4자리)로 필터링 (예: "1141000000" → "1141"로 시작하는 동만)
  const gunPrefix = gunNumber.substring(0, 4);
  const filteredEups = eupList.filter((e) => e.legalDivisionNumber.startsWith(gunPrefix));

  if (filteredEups.length === 0) {
    console.warn(`[WARN] ${gunNumber} 내 동 목록을 찾지 못했습니다.`);
    return [];
  }

  // dongs 필터가 설정된 경우 대상 동만 탐색 (Level 1: EUP 이름 포함 여부로 loose 필터링)
  const dongFilter = config.dongs?.length ? config.dongs : null;
  const targetEups = dongFilter
    ? filteredEups.filter((e) => dongFilter.some((dong) => e.legalDivisionName.includes(dong)))
    : filteredEups;

  console.log(`[단지 수집] ${targetEups.length}개 동 탐색 시작${dongFilter ? ` (전체 ${filteredEups.length}개 중 필터링)` : ''}`);

  // 2. 각 동별로 zoom=14 이동 → complexClusters 인터셉트
  const complexMap = new Map<number, ComplexCluster>();

  for (const eup of targetEups) {
    const cx = eup.coordinates.xCoordinate;
    const cy = eup.coordinates.yCoordinate;

    const clusters = await interceptComplexClusters(page, cx, cy, config);
    for (const c of clusters) {
      complexMap.set(c.complexNumber, c);
    }
  }

  console.log(`[단지 수집] 총 ${complexMap.size}개 단지 수집 완료`);

  return Array.from(complexMap.values());
}

/**
 * 단지 기본 정보 조회 (단지명, 위치, 세대수, 사용승인일, 용적률, 건폐율)
 */
export async function getComplexDetail(page: Page, complexNumber: number): Promise<ComplexDetail | null> {
  const url = `${NAVER_LAND_API}/complex?complexNumber=${complexNumber}`;
  const data = (await pageGet(page, url)) as { isSuccess: boolean; result?: ComplexDetailRaw };

  if (!data.isSuccess || !data.result) return null;

  const r = data.result;
  return {
    complexNumber,
    name: r.name,
    address: {
      city: r.address.city,
      division: r.address.division,
      sector: r.address.sector,
      jibun: r.address.jibun,
    },
    totalHouseholdNumber: r.totalHouseholdNumber,
    useApprovalDate: r.useApprovalDate,
    floorAreaRatio: r.buildingRatioInfo?.floorAreaRatio ?? null,
    buildingCoverageRatio: r.buildingRatioInfo?.buildingCoverageRatio ?? null,
  };
}

/**
 * API 응답 본문에서 매물 항목을 ArticleItem 배열로 변환
 */
function parseArticleItems(list: RawArticleItem[]): ArticleItem[] {
  return list.map((item) => {
    const info = item.representativeArticleInfo;
    const floorInfo = info.articleDetail?.floorDetailInfo;
    const dirCode = info.articleDetail?.direction ?? '';
    return {
      articleNumber: info.articleNumber,
      dongName: info.dongName ?? '',
      floor: floorInfo?.targetFloor ?? '',
      totalFloor: floorInfo?.totalFloor ?? '',
      direction: DIRECTION_MAP[dirCode] ?? dirCode,
      supplySpace: info.spaceInfo?.supplySpace ?? 0,
      exclusiveSpace: info.spaceInfo?.exclusiveSpace ?? 0,
      dealPrice: info.priceInfo?.dealPrice ?? 0,
    };
  });
}

/**
 * 단지 매물 목록 조회 (동, 층, 향, 면적, 가격)
 * 1페이지: 단지 상세 페이지 이동 후 article/list 응답 인터셉트
 * 추가 페이지: 캡처한 API URL의 pageNo 파라미터를 증가시켜 page.evaluate로 직접 호출
 */
export async function getArticleList(page: Page, complexNumber: number, config: RealEstateCrawlConfig): Promise<ArticleItem[]> {
  const articles: ArticleItem[] = [];
  const seen = new Set<string>();
  let totalCount = 0;
  let capturedReq: { url: string; body: Record<string, unknown> } | null = null;
  let lastInfo: unknown[] = [];

  // 요청 캡처 — POST body를 저장
  const reqHandler = (req: import('playwright').Request) => {
    if (req.url().includes('complex/article/list') && !capturedReq) {
      const raw = req.postData();
      if (raw) capturedReq = { url: req.url(), body: JSON.parse(raw) as Record<string, unknown> };
    }
  };

  // 1페이지 응답 인터셉트 — totalCount, lastInfo, 데이터 캡처
  const resHandler = async (res: import('playwright').Response) => {
    if (!res.url().includes('complex/article/list')) return;
    try {
      const data = (await res.json()) as {
        isSuccess: boolean;
        result?: { list?: RawArticleItem[]; totalCount?: number; lastInfo?: unknown[] };
      };
      if (!data.isSuccess || !data.result?.list) return;
      if (totalCount === 0 && data.result.totalCount !== undefined) {
        totalCount = data.result.totalCount;
      }
      if (data.result.lastInfo) lastInfo = data.result.lastInfo;
      for (const item of parseArticleItems(data.result.list)) {
        if (!seen.has(item.articleNumber)) {
          seen.add(item.articleNumber);
          articles.push(item);
        }
      }
    } catch {
      /* 파싱 실패 무시 */
    }
  };

  page.on('request', reqHandler);
  page.on('response', resHandler);
  await page.goto(`https://fin.land.naver.com/complexes/${complexNumber}?${buildFilterParams(config)}&tab=article`, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  });
  await page.waitForTimeout(3_000);
  page.off('request', reqHandler);
  page.off('response', resHandler);

  // 추가 페이지: lastInfo 커서를 다음 요청 body에 전달
  if (totalCount > articles.length && capturedReq) {
    console.log(`  [페이지네이션] ${articles.length}/${totalCount}건 → 커서 기반 추가 호출`);

    const { url: apiUrl, body: baseBody } = capturedReq!;

    while (articles.length < totalCount) {
      type FetchArg = { url: string; body: string };
      const reqBody: Record<string, unknown> = Object.assign({}, baseBody, { lastInfo });
      const fetchArg: FetchArg = {
        url: apiUrl,
        body: JSON.stringify(reqBody),
      };

      const data = (await page.evaluate(async (arg: FetchArg) => {
        const res = await fetch(arg.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: arg.body,
          credentials: 'include',
        });
        return res.json();
      }, fetchArg)) as { isSuccess: boolean; result?: { list?: RawArticleItem[]; lastInfo?: unknown[] } };

      if (!data.isSuccess || !data.result?.list?.length) break;

      const prevCount = articles.length;
      for (const item of parseArticleItems(data.result.list)) {
        if (!seen.has(item.articleNumber)) {
          seen.add(item.articleNumber);
          articles.push(item);
        }
      }

      lastInfo = data.result.lastInfo ?? [];

      // 새 항목이 추가되지 않으면 더 이상 수집 불가 (무한루프 방지)
      if (articles.length === prevCount) break;
    }
  }

  if (totalCount > 0 && articles.length < totalCount) {
    console.warn(`  [경고] 매물 ${articles.length}/${totalCount}건만 수집됨 (일부 누락 가능)`);
  }

  return articles;
}

/** getArticleList 반환 타입 */
export interface ArticleItem {
  articleNumber: string;
  dongName: string;
  floor: string;
  totalFloor: string;
  direction: string;
  supplySpace: number;
  exclusiveSpace: number;
  dealPrice: number;
}

interface ComplexDetailRaw {
  name: string;
  address: { city: string; division: string; sector: string; jibun: string };
  totalHouseholdNumber: number;
  useApprovalDate: string;
  buildingRatioInfo?: { floorAreaRatio: number; buildingCoverageRatio: number };
}

interface RawArticleItem {
  representativeArticleInfo: {
    articleNumber: string;
    dongName?: string;
    articleDetail?: {
      direction?: string;
      floorDetailInfo?: { targetFloor?: string; totalFloor?: string };
    };
    spaceInfo?: { supplySpace?: number; exclusiveSpace?: number };
    priceInfo?: { dealPrice?: number };
  };
}
