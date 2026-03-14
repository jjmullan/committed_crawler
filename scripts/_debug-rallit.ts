import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

async function main() {
  const url = 'https://www.rallit.com/?job=FRONTEND_DEVELOPER&jobGroup=DEVELOPER&jobLevel=IRRELEVANT,INTERN,BEGINNER&pageNumber=1';

  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  // API 요청 인터셉트
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

  // 1. 현재 파서 동작 확인
  const jobs = $('a[href*="/positions/"]');
  console.log('a[href*="/positions/"] 수:', jobs.length);

  // 2. 페이지네이션 요소 탐색
  console.log('\n=== 페이지네이션 관련 요소 ===');
  $('[class*="paginat"], [class*="Paginat"], [class*="page"], nav').each((i, el) => {
    if (i > 5) return;
    console.log(`${el.tagName} class="${$(el).attr('class') ?? ''}" text="${$(el).text().replace(/\s+/g, ' ').trim().slice(0, 80)}"`);
  });

  // 3. 총 공고 수 / 페이지 수 표시 요소
  console.log('\n=== 공고 수 텍스트 ===');
  $('*').filter((_, el) => {
    const text = $(el).text().trim();
    return /\d+\s*(개|건|페이지|page)/i.test(text) && text.length < 50;
  }).slice(0, 8).each((_, el) => {
    console.log(`${el.tagName}: "${$(el).text().trim()}"`);
  });

  // 4. API 호출
  console.log('\n=== fetch/xhr 요청 ===');
  apiCalls.filter(u => !u.includes('google') && !u.includes('analytics') && !u.includes('criteo')).forEach(u => console.log(u));

  // 5. 첫 공고 카드 HTML
  console.log('\n=== 첫 공고 카드 HTML ===');
  console.log($('a[href*="/positions/"]').first().prop('outerHTML')?.slice(0, 600));

  await browser.close();
}

main().catch(console.error);
