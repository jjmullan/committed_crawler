import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

async function main() {
  const url = 'https://www.careerly.co.kr/job?title=%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C&requirements=%EC%8B%A0%EC%9E%85';

  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  // API 인터셉트
  const apiCalls: string[] = [];
  page.on('request', req => {
    if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
      apiCalls.push(`[${req.method()}] ${req.url()}`);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const html = await page.content();
  const $ = cheerio.load(html);

  // 1. 기존 셀렉터 확인
  console.log('=== 기존 셀렉터 결과 ===');
  console.log('[class*="JobCard"], [class*="job-card"]:', $('[class*="JobCard"], [class*="job-card"]').length, '건');

  // 2. 공고 카드 후보 탐색
  console.log('\n=== 공고 카드 후보 ===');
  const candidates = [
    'article', 'li', '[class*="card"]', '[class*="Card"]',
    '[class*="job"]', '[class*="Job"]', '[class*="item"]', '[class*="Item"]',
    'a[href*="/jobs/"]', 'a[href*="/job/"]', 'a[href*="/position"]',
  ];
  for (const sel of candidates) {
    const count = $(sel).length;
    if (count > 0 && count < 100) console.log(`${sel}: ${count}건`);
  }

  // 3. 첫 번째 a 태그 샘플
  console.log('\n=== href 포함 링크 샘플 ===');
  $('a[href]').filter((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    return text.length > 5 && text.length < 100;
  }).slice(0, 15).each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    console.log(`"${href}" → "${text.slice(0, 80)}"`);
  });

  // 4. API 호출
  console.log('\n=== fetch/xhr 요청 ===');
  apiCalls
    .filter(u => !u.includes('google') && !u.includes('analytics') && !u.includes('facebook') && !u.includes('amplitude'))
    .forEach(u => console.log(u));

  await browser.close();
}
main().catch(console.error);
