import { type NextRequest, NextResponse } from 'next/server';
import { runRealEstateCrawl } from '@/features/crawl-realestate';
import type { RealEstateCrawlConfig } from '@/features/crawl-realestate';

/**
 * POST /api/crawl-realestate
 *
 * 요청 바디 예시:
 * {
 *   "center": "126.93679999999995-37.57922500000002",
 *   "tradeTypes": ["A1"],
 *   "realEstateTypes": ["A01", "A04", "B01"],
 *   "dealPrice": { "min": 0, "max": 600000000 }
 * }
 *
 * center 값은 네이버 부동산 URL의 center 파라미터에서 복사 (경도-위도 순서)
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<RealEstateCrawlConfig>;

  if (!body.center) {
    return NextResponse.json({ error: 'center 파라미터가 필요합니다.' }, { status: 400 });
  }

  const config: RealEstateCrawlConfig = {
    center: body.center,
    tradeTypes: body.tradeTypes ?? ['A1'],
    realEstateTypes: body.realEstateTypes ?? ['A01', 'A04', 'B01'],
    dealPrice: body.dealPrice ?? { min: 0, max: 600_000_000 },
  };

  const result = await runRealEstateCrawl(config);

  return NextResponse.json(result);
}
