import { CRAWLER_CONFIG } from '@/shared/config/crawler';

/**
 * 주어진 URL에 GET 요청을 보내 raw HTML 문자열을 반환한다.
 * JavaScript를 실행하지 않으므로 SSR 사이트에만 유효하다.
 */
export async function extractStatic(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': CRAWLER_CONFIG.userAgent },
    signal: AbortSignal.timeout(CRAWLER_CONFIG.timeout),
  });

  if (!res.ok) {
    throw new Error(`요청 실패 (HTTP ${res.status}): ${url}`);
  }

  return res.text();
}
