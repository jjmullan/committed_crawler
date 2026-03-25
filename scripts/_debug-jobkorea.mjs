import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
const page = await context.newPage();
await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
await page.goto('https://www.jobkorea.co.kr/Search/?stext=%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C&tabType=recruit&careerType=1&careerFrom=0&careerTo=2', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);

const result = await page.evaluate(() => {
  // 채용공고 링크 탐색
  const links = Array.from(document.querySelectorAll('a[href*="Recruit/Info"]'));
  return links.slice(0, 3).map(a => {
    const parent = a.closest('li') || a.closest('tr') || a.parentElement;
    return {
      href: a.getAttribute('href'),
      aText: (a.textContent || '').trim().slice(0, 80),
      parentText: parent ? (parent.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 150) : '',
      parentCls: parent ? parent.getAttribute('class') : '',
    };
  });
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
