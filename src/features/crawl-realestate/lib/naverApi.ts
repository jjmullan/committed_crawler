import type { Page } from 'playwright';
import { NAVER_LAND_API, DIRECTION_MAP } from '../config/realestate';
import type { LegalDivision, RealEstateArticle } from '../model/types';

/**
 * center 파라미터(경도-위도 문자열)를 좌표 객체로 파싱
 * 예: "126.936-37.579" → { lng: 126.936, lat: 37.579 }
 */
export function parseCenter(center: string): { lng: number; lat: number } {
  const [lng, lat] = center.split('-').map(Number);
  return { lng, lat };
}

/**
 * center 좌표 → 행정구역 정보 조회 (결과 레이블 표시용)
 */
export async function getLegalDivision(page: Page, lng: number, lat: number): Promise<LegalDivision> {
  const url = `${NAVER_LAND_API}/legalDivision/searchByCoordinate?longitude=${lng}&latitude=${lat}&type=GUN&needsPolygon=false`;
  const data = (await page.evaluate(async (reqUrl: string) => {
    const res = await fetch(reqUrl);
    return res.json();
  }, url)) as { isSuccess: boolean; detailCode?: string; result: LegalDivision };

  if (!data.isSuccess || !data.result) {
    throw new Error(`행정구역 조회 실패: ${data.detailCode ?? JSON.stringify(data)}`);
  }

  return data.result;
}

/** boundedArticles API raw 응답 타입 */
interface RawArticleInfo {
  complexName?: string;
  articleNumber: string;
  dongName?: string;
  tradeType?: string;
  spaceInfo?: {
    supplySpace?: number;
    exclusiveSpace?: number;
    supplySpaceName?: string;
    exclusiveSpaceName?: string;
    nameType?: string;
  };
  buildingInfo?: {
    buildingConjunctionDate?: string;
    approvalElapsedYear?: number;
  };
  verificationInfo?: {
    exposureStartDate?: string;
  };
  articleDetail?: {
    direction?: string;
    floorDetailInfo?: { targetFloor?: string; totalFloor?: string };
  };
  address?: {
    city?: string;
    division?: string;
    sector?: string;
    coordinates?: { xCoordinate: number; yCoordinate: number };
  };
  priceInfo?: {
    dealPrice?: number;
    managementFeeAmount?: number;
  };
}

interface RawBoundedArticleItem {
  representativeArticleInfo?: RawArticleInfo;
  duplicatedArticleInfo?: {
    realtorCount?: number;
    articleInfoList?: RawArticleInfo[];
  };
}

function parseArticle(info: RawArticleInfo, realtorCount: number): RealEstateArticle {
  const dirCode = info.articleDetail?.direction ?? '';
  const floor = info.articleDetail?.floorDetailInfo;
  const nameType = info.spaceInfo?.nameType ?? '';
  const typeName = nameType
    ? `${info.spaceInfo?.exclusiveSpaceName ?? ''}${nameType}`
    : (info.spaceInfo?.exclusiveSpaceName ?? '');

  return {
    complexName: info.complexName ?? '',
    city: info.address?.city ?? '',
    division: info.address?.division ?? '',
    sector: info.address?.sector ?? '',
    buildingConjunctionDate: info.buildingInfo?.buildingConjunctionDate ?? '',
    approvalElapsedYear: info.buildingInfo?.approvalElapsedYear ?? 0,
    articleNumber: info.articleNumber,
    articleUrl: '',  // pipeline에서 complexNumber 없이 articleNumber만으로 구성
    dongName: info.dongName ?? '',
    floor: floor?.targetFloor ?? '',
    totalFloor: floor?.totalFloor ?? '',
    direction: DIRECTION_MAP[dirCode] ?? dirCode,
    supplySpace: info.spaceInfo?.supplySpace ?? 0,
    exclusiveSpace: info.spaceInfo?.exclusiveSpace ?? 0,
    spaceTypeName: typeName,
    dealPrice: info.priceInfo?.dealPrice ?? 0,
    managementFeeAmount: info.priceInfo?.managementFeeAmount ?? 0,
    exposureStartDate: info.verificationInfo?.exposureStartDate ?? '',
    realtorCount,
  };
}

/**
 * 네이버 부동산 URL로 이동 후 매물 목록 전체 수집
 * - 동일 조건 매물이 여러 건이어도 대표 매물(최상단) 하나만 수집
 * - lastInfo 커서 기반 페이지네이션으로 모든 매물 수집 (무한스크롤 대응)
 */
export async function collectArticles(page: Page, url: string): Promise<RealEstateArticle[]> {
  const articles: RealEstateArticle[] = [];
  const seen = new Set<string>();
  let totalCount = 0;
  let capturedApiUrl: string | null = null;
  let capturedReqBody: Record<string, unknown> | null = null;
  let lastInfo: unknown[] = [];

  type RawResp = { list: RawBoundedArticleItem[]; totalCount?: number; lastInfo?: unknown[] };
  const rawResponses: RawResp[] = [];

  const reqHandler = (req: import('playwright').Request) => {
    const reqUrl = req.url();
    if (reqUrl.includes('boundedArticles') && !reqUrl.includes('Count')) {
      rawResponses.length = 0;
      capturedApiUrl = reqUrl;
      const raw = req.postData();
      if (raw) try { capturedReqBody = JSON.parse(raw) as Record<string, unknown>; } catch { /* ignore */ }
    }
  };

  const resHandler = async (res: import('playwright').Response) => {
    const resUrl = res.url();
    if (resUrl.includes('boundedArticlesCount')) {
      try {
        const data = (await res.json()) as { isSuccess?: boolean; result?: { totalCount?: number } };
        if (data.isSuccess && data.result?.totalCount !== undefined && totalCount === 0) {
          totalCount = data.result.totalCount;
        }
      } catch { /* ignore */ }
      return;
    }
    if (!resUrl.includes('boundedArticles')) return;
    try {
      const data = (await res.json()) as {
        isSuccess?: boolean;
        result?: { list?: RawBoundedArticleItem[]; totalCount?: number; lastInfo?: unknown[] };
      };
      if (!data.isSuccess || !data.result?.list) return;
      if (totalCount === 0 && data.result.totalCount) totalCount = data.result.totalCount;
      rawResponses.push({ list: data.result.list, totalCount: data.result.totalCount, lastInfo: data.result.lastInfo });
    } catch { /* ignore */ }
  };

  page.on('request', reqHandler);
  page.on('response', resHandler);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(5_000);

  page.off('request', reqHandler);
  page.off('response', resHandler);

  // 첫 번째 배치 파싱
  for (const raw of rawResponses) {
    if (raw.lastInfo) lastInfo = raw.lastInfo;
    for (const item of flattenArticles(raw.list)) {
      if (!seen.has(item.articleNumber)) {
        seen.add(item.articleNumber);
        articles.push(item);
      }
    }
  }

  console.log(`[수집] 1차: ${articles.length}건 / 총 ${totalCount}건`);

  // 커서 기반 추가 페이지 수집 (무한스크롤 대응)
  if (totalCount > articles.length && capturedApiUrl && capturedReqBody) {
    const apiUrl = capturedApiUrl;
    const baseBody = capturedReqBody as Record<string, unknown>;
    const basePaging = (baseBody.articlePagingRequest as Record<string, unknown>) ?? {};

    while (articles.length < totalCount) {
      type FetchArg = { url: string; body: string };
      const reqBody: Record<string, unknown> = {
        ...baseBody,
        articlePagingRequest: { ...basePaging, lastInfo },
      };

      const data = (await page.evaluate(async (arg: FetchArg) => {
        const res = await fetch(arg.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: arg.body,
          credentials: 'include',
        });
        return res.json();
      }, { url: apiUrl, body: JSON.stringify(reqBody) })) as {
        isSuccess: boolean;
        result?: { list?: RawBoundedArticleItem[]; lastInfo?: unknown[] };
      };

      if (!data.isSuccess || !data.result?.list?.length) break;

      const prevCount = articles.length;
      for (const item of flattenArticles(data.result.list)) {
        if (!seen.has(item.articleNumber)) {
          seen.add(item.articleNumber);
          articles.push(item);
        }
      }

      lastInfo = data.result.lastInfo ?? [];
      console.log(`[수집] ${articles.length}건 / 총 ${totalCount}건`);

      if (articles.length === prevCount) break;
    }
  }

  if (totalCount > 0 && articles.length < totalCount) {
    console.warn(`[경고] ${articles.length}/${totalCount}건만 수집됨`);
  }

  return articles;
}

/**
 * boundedArticles list에서 대표 매물(최상단) 하나만 수집
 * 동일 조건 매물이 여러 건이어도 representativeArticleInfo만 사용
 */
function flattenArticles(list: RawBoundedArticleItem[]): RealEstateArticle[] {
  const result: RealEstateArticle[] = [];
  for (const item of list) {
    const realtorCount = item.duplicatedArticleInfo?.realtorCount ?? 1;
    if (item.representativeArticleInfo) {
      result.push(parseArticle(item.representativeArticleInfo, realtorCount));
    }
  }
  return result;
}
