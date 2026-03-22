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
    // sector: '서울시 구로구 가리봉동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.88773800000001-37.483351&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 개봉동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.85681299999999-37.494393&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 고척동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.85979999999995-37.50240000000001&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 구로동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.88229999999999-37.493699999999976&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 궁동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.82770000000005-37.5009&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 신도림동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.880583-37.507766000000004&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 오류동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.83837500000004-37.49214300000001&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 온수동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.82069999999999-37.49379999999999&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 천왕동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.83910000000003-37.48019999999998&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 구로구 항동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.82580000000007-37.480999999999995&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 갈현동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.17370000000005-37.42390000000002&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 금광동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.17370000000005-37.42390000000002&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 상대원동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.18096300000002-37.44216800000001&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 성남동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.13428499999998-37.43367300000001&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 여수동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.13149999999996-37.4216&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 은행동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.17650000000003-37.46260000000001&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 중앙동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.15745800000002-37.44397199999999&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 성남시 중원구 하대원동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=127.14632200000005-37.42829900000001&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 안양시 동안구 관양동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.96440000000007-37.40989999999999&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 안양시 동안구 비산동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.94161699999995-37.399339999999995&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 안양시 동안구 평촌동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.97367699999995-37.389391&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '경기도 안양시 동안구 호계동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.95651299999997-37.37698999999998&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 관악구 남현동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.97783700000002-37.474538999999965&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 관악구 봉천동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.95669999999996-37.475300000000004&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
  {
    // sector: '서울시 관악구 신림동',
    url: 'https://fin.land.naver.com/map?tradeTypes=A1&realEstateTypes=A01&dealPrice=0-720000000&space=49.587-Infinity&householdNumber=300-Infinity&exclusiveSpaceMode=true&center=126.93460000000005-37.463199999999986&zoom=14.21737921914126&showOnlySelectedRegion=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA',
  },
];
