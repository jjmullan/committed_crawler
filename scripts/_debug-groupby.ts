import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

async function main() {
  const url = 'https://groupby.kr/positions?careerTypes=1&positionTypes=1';

  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // API 요청 인터셉트
  const apiCalls: string[] = [];
  page.on('request', req => {
    if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
      apiCalls.push(`[${req.method()}] ${req.url()}`);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // 스크롤 후 추가 로드 확인
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  const html = await page.content();
  const $ = cheerio.load(html);

  // 1. 기존 파서 확인
  console.log('=== 기존 셀렉터 결과 ===');
  console.log('[class*="PositionItem"], [class*="position-item"]:', $('[class*="PositionItem"], [class*="position-item"]').length, '건');

  // 2. 공고 카드 패턴 탐색
  console.log('\n=== 공고 카드 후보 ===');
  const candidates = [
    'article', 'li[class*="position"]', 'li[class*="Position"]',
    'a[href*="/positions/"]', 'a[href*="/position/"]',
    '[class*="card"]', '[class*="Card"]', '[class*="item"]', '[class*="Item"]',
    '[class*="job"]', '[class*="Job"]',
  ];
  for (const sel of candidates) {
    const count = $(sel).length;
    if (count > 0) console.log(`${sel}: ${count}건`);
  }

  // 3. body 전체에서 링크 + 공고 텍스트 탐색
  console.log('\n=== href 포함 링크 샘플 ===');
  $('a[href]').slice(0, 20).each((i, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 80);
    if (text) console.log(`${href} → "${text}"`);
  });

  // 4. API 호출
  console.log('\n=== fetch/xhr 요청 ===');
  apiCalls
    .filter(u => !u.includes('google') && !u.includes('analytics') && !u.includes('criteo') && !u.includes('facebook'))
    .forEach(u => console.log(u));

  await browser.close();
}

main().catch(console.error);
