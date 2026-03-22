import { type NextRequest, NextResponse } from 'next/server';
import { runRealEstateCrawl } from '@/features/crawl-realestate';
import type { RealEstateCrawlConfig } from '@/features/crawl-realestate';

/**
 * POST /api/crawl-realestate
 *
 * 요청 바디 예시:
 * {
 *   "url": "https://fin.land.naver.com/map?tradeTypes=A1&...",
 *   "sector": "개봉동"
 * }
 *
 * url 값은 네이버 부동산 URL을 그대로 붙여넣어 사용
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<RealEstateCrawlConfig>;

  if (!body.url) {
    return NextResponse.json({ error: 'url 파라미터가 필요합니다.' }, { status: 400 });
  }

  const config: RealEstateCrawlConfig = {
    url: body.url,
    sector: body.sector,
  };

  const result = await runRealEstateCrawl(config);

  return NextResponse.json(result);
}
