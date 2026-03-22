/** 네이버 부동산 boundedArticles API 기반 타입 정의 */

/** 행정구역 정보 (legalDivision API 응답) */
export interface LegalDivision {
  legalDivisionNumber: string;
  cityName: string;
  divisionName: string;
}

/** 매물 1건 (boundedArticles API 직접 수집, 단지 정보 API 미사용) */
export interface RealEstateArticle {
  /** 단지 */
  complexName: string;

  /** 주소 */
  city: string;      // 도/시 (예: "서울시")
  division: string;  // 구 (예: "구로구")
  sector: string;    // 행정동 (예: "개봉동")

  /** 건물 정보 */
  buildingConjunctionDate: string;  // 준공일 (YYYYMMDD)
  approvalElapsedYear: number;      // 준공 경과년수

  /** 매물 기본 */
  articleNumber: string;
  articleUrl: string;
  dongName: string;   // 동 (예: "203동")
  floor: string;
  totalFloor: string;
  direction: string;  // 향 (예: "남향")

  /** 면적 */
  supplySpace: number;     // 공급면적 (㎡)
  exclusiveSpace: number;  // 전용면적 (㎡)
  spaceTypeName: string;   // 타입명 (예: "84A", "101")

  /** 가격 */
  dealPrice: number;           // 매매가 (원)
  managementFeeAmount: number; // 관리비 (원)

  /** 매물 추가 정보 */
  exposureStartDate: string;          // 매물 등록일
  realtorCount: number;               // 동일조건 중개 수
}

/** 크롤링 설정 */
export interface RealEstateCrawlConfig {
  /** 네이버 부동산 지도 URL (모든 필터 파라미터 포함) */
  url: string;
  /** 수집 후 결과 필터링용 행정동 (선택) */
  sector?: string;
}

/** 크롤링 결과 */
export interface RealEstateCrawlResult {
  region: string;
  totalArticles: number;
  articles: RealEstateArticle[];
  crawledAt: string;
  duration: number;
  error?: string;
}

/** 배치 크롤링 결과 */
export interface RealEstateBatchResult {
  results: RealEstateCrawlResult[];
  totalArticles: number;
}
