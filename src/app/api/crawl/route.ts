// 크롤링을 트리거하는 API Route
// POST /api/crawl

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/** 요청 바디 스키마 */
const RequestSchema = z.object({
  url: z.string().url('유효한 URL을 입력하세요.'),
  waitForSelector: z.string().optional(),
  timeout: z.number().positive().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 실제 크롤링 로직은 이후 단계에서 연결합니다.
  // pipeline.ts의 runPipeline()을 호출하도록 확장 예정

  return NextResponse.json({
    success: true,
    message: '크롤러 API가 정상 동작합니다.',
    receivedOptions: parsed.data,
  });
}
