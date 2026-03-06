// 크롤링을 트리거하는 API Route
// POST /api/crawl

import { NextResponse } from 'next/server';
import { crawlCollectio } from '@/lib/crawler/sites/collectio';

export async function POST(): Promise<NextResponse> {
  try {
    const { movies, errors } = await crawlCollectio();

    return NextResponse.json({
      success: true,
      count: movies.length,
      errorCount: errors.length,
      data: movies,
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
