/** 네이버 부동산 API 기반 타입 정의 */

/** 행정구역 정보 (legalDivision API 응답) */
export interface LegalDivision {
  legalDivisionNumber: string; // 예: "1141000000"
  cityName: string; // 예: "서울시"
  divisionName: string; // 예: "서대문구"
  polygon?: {
    coordinates: Array<{
      coordinates: Array<{
        type: string;
        coordinates: Array<{ x: number; y: number }>;
      }>;
    }>;
  };
}

/** 지도 범위 */
export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** complexClusters API 응답의 단지 클러스터 항목 */
export interface ComplexCluster {
  complexNumber: number;
  realEstateType: string;
  coordinates: { xCoordinate: number; yCoordinate: number };
  useApprovalDate: string;
  totalHouseholdNumber: number;
}

/** 단지 기본 정보 (complex API 응답) */
export interface ComplexDetail {
  complexNumber: number;
  name: string;
  address: {
    city: string; // 도/시 (예: "경기도", "서울시")
    division: string; // 구 (예: "수원시 권선구", "서대문구")
    sector: string; // 동 (예: "당수동")
    jibun: string;
  };
  totalHouseholdNumber: number;
  useApprovalDate: string; // "YYYYMMDD"
  floorAreaRatio: number | null; // 용적률 (데이터 없으면 null)
  buildingCoverageRatio: number | null; // 건폐율 (데이터 없으면 null)
}

/** 매물 1건 */
export interface RealEstateArticle {
  complexNumber: number;
  complexName: string;
  city: string;
  division: string;
  sector: string; // 동 (예: "신도림동")
  totalHouseholdNumber: number;
  useApprovalDate: string;
  floorAreaRatio: number | null; // 용적률
  buildingCoverageRatio: number | null; // 건폐율
  articleNumber: string;
  articleUrl: string; // 매물 상세 페이지 URL
  dongName: string; // 동 (예: "203동")
  floor: string; // 층 (API 원본 그대로: "12", "고층", "중층" 등)
  totalFloor: string; // 전체 층 (API 원본 그대로)
  direction: string; // 향 (예: "남향", "서향", 미매핑 코드 그대로)
  supplySpace: number; // 공급면적 (㎡)
  exclusiveSpace: number; // 전용면적 (㎡)
  dealPrice: number; // 매물 가격 (원)
}

/** 크롤링 설정 */
export interface RealEstateCrawlConfig {
  /** URL에서 추출한 center 좌표 (경도-위도 형태) */
  center: string;
  /** 거래 유형 (A1=매매, B1=전세, B2=월세) */
  tradeTypes: string[];
  /** 부동산 유형 (A01=아파트, A04=재건축, B01=아파트분양권) */
  realEstateTypes: string[];
  /** 매매가 필터 (원). min/max 중 하나만 지정 가능 */
  dealPrice: { min?: number; max?: number };
  /** 면적 필터 (㎡). 미설정 시 필터 미적용. min/max 중 하나만 지정 가능 */
  space?: { min?: number; max?: number };
  /** 전용면적 여부 */
  exclusiveSpaceMode?: boolean;
  /** 세대수 필터. 미설정 시 필터 미적용. min/max 중 하나만 지정 가능 */
  householdNumber?: { min?: number; max?: number };
  /** 역세권 도보 최대 거리 (분). 미설정 시 필터 미적용 */
  subwayWalkingMinute?: number;
  /** 사용승인 경과 연도 필터 (0=신축). 미설정 시 필터 미적용. min/max 중 하나만 지정 가능 */
  approvalElapsedYear?: { min?: number; max?: number };
  /** 수집 대상 행정동 목록. 미설정 시 구 전체 수집 */
  dongs?: string[];
}

/** 크롤링 결과 */
export interface RealEstateCrawlResult {
  region: string; // 행정구역명 (예: "서울시 서대문구")
  totalComplexes: number;
  totalArticles: number;
  articles: RealEstateArticle[];
  crawledAt: string;
  duration: number;
  error?: string;
}

/** 배치 크롤링 결과 */
export interface RealEstateBatchResult {
  results: RealEstateCrawlResult[];
  totalComplexes: number;
  totalArticles: number;
}
