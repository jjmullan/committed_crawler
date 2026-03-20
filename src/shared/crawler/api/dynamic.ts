import { chromium } from 'playwright';
import { CRAWLER_CONFIG } from '@/shared/config/crawler';

/**
 * Chromium 브라우저를 실행하여 JS 렌더링이 완료된 HTML을 반환한다.
 * fetch로 수집 불가능한 SPA(React, Vue 등) 사이트에 사용한다.
 */
export async function extractDynamic(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ 'User-Agent': CRAWLER_CONFIG.userAgent });

    // networkidle: 네트워크 요청이 500ms 동안 없을 때 로드 완료로 간주
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: CRAWLER_CONFIG.timeout,
    });

    return await page.content();
  } finally {
    // 에러 발생 여부와 무관하게 브라우저를 반드시 종료
    await browser.close();
  }
}
