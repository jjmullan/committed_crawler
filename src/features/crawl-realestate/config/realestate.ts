import type { RealEstateCrawlConfig } from '../model/types';

/** 네이버 부동산 API 베이스 URL */
export const NAVER_LAND_API = 'https://fin.land.naver.com/front-api/v1';

/**
 * 향(direction) 코드 → 한글 변환 맵
 * 네이버 부동산 API에서 반환하는 코드값
 */
export const DIRECTION_MAP: Record<string, string> = {
  // 주요 4방향 — doubled 코드 (구로구 실측 확인)
  SS: '남향',
  EE: '동향',
  WW: '서향',
  NN: '북향',
  // 주요 4방향 — S-suffix 코드 (구로구 실측 확인)
  ES: '동향',
  WS: '서향',
  NS: '북향',
  // 대각선 방향 — N-suffix 코드 (구로구 실측 확인)
  EN: '동북향',
  WN: '서북향',
  // 대각선 방향 — S-suffix 코드 (다른 지역 대비 레거시 보존)
  SES: '남동향',
  SWS: '남서향',
  NES: '북동향',
  NWS: '북서향',
};

/**
 * 네이버 부동산 필터 기본값
 * URL 파라미터에서 확인된 값 그대로 사용
 */
export const DEFAULT_FILTER = {
  roomCount: [],
  bathRoomCount: [],
  optionTypes: [],
  oneRoomShapeTypes: [],
  moveInTypes: [],
  filtersExclusiveSpace: false,
  floorTypes: [],
  directionTypes: [],
  hasArticlePhoto: false,
  isAuthorizedByOwner: false,
  parkingTypes: [],
  entranceTypes: [],
  hasArticle: false,
} as const;

/**
 * 수집 대상 지역 목록
 * 새 지역 추가 시 이 배열에 객체를 추가
 * center 값은 네이버 부동산 URL의 center 파라미터에서 추출 (경도-위도 순서)
 */
export const TARGET_REGIONS: RealEstateCrawlConfig[] = [
  {
    /* 구로구 */
    center: '126.88753199999996-37.49551000000001', // 지역별 중앙 좌표
    tradeTypes: ['A1'], // 매매
    realEstateTypes: ['A01'], // 아파트
    dealPrice: { max: 720_000_000 }, // 최대 7억 2천만원
    space: { min: 50 }, // 15평(50m2) 이상
    householdNumber: { min: 300 }, // 300세대 이상
    exclusiveSpaceMode: true,
    dongs: ['가리봉동', '개봉동', '고척동', '구로동', '궁동', '신도림동', '오류동', '온수동', '천왕동', '항동'],
    // subwayWalkingMinute: 20, // 최대 도보 20분
    // approvalElapsedYear: { min: 0, max: 20 }, // 사용승인 최대 20년
  },
];
