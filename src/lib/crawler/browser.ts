// Playwright 브라우저 인스턴스를 생성하고 관리하는 모듈

import { chromium, type Browser, type Page, type Route } from 'playwright';

/** 브라우저 실행 옵션 */
interface BrowserOptions {
  /** true: 실제 브라우저 창 표시, false: 백그라운드 실행 (기본값) */
  headless?: boolean;
}

/**
 * Chromium 브라우저 인스턴스를 생성합니다.
 * 사용 후 반드시 browser.close()를 호출해야 합니다.
 */
export async function createBrowser(options: BrowserOptions = {}): Promise<Browser> {
  const { headless = true } = options;

  return chromium.launch({ headless });
}

/**
 * 새 페이지를 생성하고 기본 설정을 적용합니다.
 * - User-Agent 설정으로 봇 탐지 최소화
 * - 불필요한 리소스(이미지, 폰트) 차단으로 속도 향상
 */
export async function createPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // 이미지, 폰트 요청 차단 (크롤링 속도 향상)
  await page.route('**/*', (route: Route) => {
    const resourceType = route.request().resourceType();
    if (resourceType === 'image' || resourceType === 'font') {
      route.abort();
    } else {
      route.continue();
    }
  });

  return page;
}
