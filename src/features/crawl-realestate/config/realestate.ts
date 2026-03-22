import type { RealEstateCrawlConfig } from '../model/types';

/** 네이버 부동산 API 베이스 URL */
export const NAVER_LAND_API = 'https://fin.land.naver.com/front-api/v1';

/**
 * 향(direction) 코드 → 한글 변환 맵
 */
export const DIRECTION_MAP: Record<string, string> = {
  SS: '남향',
  EE: '동향',
  WW: '서향',
  NN: '북향',
  ES: '동향',
  WS: '서향',
  NS: '북향',
  EN: '동북향',
  WN: '서북향',
  SES: '남동향',
  SWS: '남서향',
  NES: '북동향',
  NWS: '북서향',
};

/**
 * 수집 대상 지역 목록
 * 네이버 부동산 URL을 그대로 붙여넣어 사용
 */
export const TARGET_REGIONS: RealEstateCrawlConfig[] = [
  {
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.85681299999999-37.494393&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
    sector: '개봉동',
  },
];
