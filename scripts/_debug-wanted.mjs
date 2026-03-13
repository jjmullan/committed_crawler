import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 900 },
  locale: 'ko-KR',
});
const page = await context.newPage();
await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
await page.goto('https://www.wanted.co.kr/wdlist/518/669?country=kr&job_sort=job.latest_order&years=0&years=2&locations=all', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);

const result = await page.evaluate(() => {
  const a = document.querySelector('li a[href*="/wd/"]');
  if (!a) return [];
  return Array.from(a.querySelectorAll('*')).map(el => ({
    tag: el.tagName,
    cls: el.getAttribute('class') || '',
    text: (el.textContent || '').trim().slice(0, 60),
  })).filter(x => x.text && x.cls);
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
