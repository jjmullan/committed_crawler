import { type NextRequest, NextResponse } from 'next/server';
import { CrawlConfigSchema } from '@/entities/crawl-item';
import { runPipeline } from '@/features/crawl';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 요청 body를 스키마로 검증. 실패 시 zod 에러 메시지를 그대로 반환
  const parsed = CrawlConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
  }

  const result = await runPipeline(parsed.data);

  return NextResponse.json(result);
}
