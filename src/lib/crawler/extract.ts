// 페이지에서 원시 HTML을 추출하는 모듈 (Extract 단계)

import { createBrowser, createPage } from './browser';
import type { CrawlOptions, RawCrawlResult } from './types';

/**
 * 대상 URL에 접속하여 JS 렌더링이 완료된 HTML을 반환합니다.
 *
 * React/Next.js 기반 사이트는 JS 실행 후에 DOM이 완성되므로,
 * waitForSelector로 특정 요소가 나타날 때까지 대기합니다.
 */
export async function extractHtml(options: CrawlOptions): Promise<RawCrawlResult> {
  const { url, waitForSelector, timeout = 30000 } = options;

  const browser = await createBrowser();

  try {
    const page = await createPage(browser);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    // 특정 셀렉터가 지정된 경우 해당 요소가 나타날 때까지 대기
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout });
    }

    const html = await page.content();

    return {
      url,
      html,
      crawledAt: new Date().toISOString(),
    };
  } finally {
    // 에러 발생 시에도 반드시 브라우저 종료
    await browser.close();
  }
}
