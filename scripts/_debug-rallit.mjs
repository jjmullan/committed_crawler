import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
const page = await context.newPage();
await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
await page.goto('https://www.rallit.com/?job=FRONTEND_DEVELOPER&jobGroup=DEVELOPER&pageNumber=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);

// 첫 번째 포지션 카드의 내부 구조
const result = await page.evaluate(() => {
  const card = document.querySelector('a[href*="/positions/"]');
  if (!card) return { error: 'card not found' };
  return {
    href: card.getAttribute('href'),
    children: Array.from(card.querySelectorAll('*')).map(el => ({
      tag: el.tagName,
      cls: el.getAttribute('class') || '',
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
    })).filter(x => x.text && x.cls),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
