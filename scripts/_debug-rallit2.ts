import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';
import { parseRallit_test } from '../src/features/crawl/config/sites-test';

// 간단히 직접 구현
import * as cheerio from 'cheerio';

async function main() {
  const url = 'https://www.rallit.com/?job=FRONTEND_DEVELOPER&jobGroup=DEVELOPER&jobLevel=IRRELEVANT,INTERN,BEGINNER&pageNumber=1';

  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  const html = await page.content();
  const $ = cheerio.load(html);

  $('a[href*="/positions/"]').slice(0, 5).each((i, el) => {
    const $el = $(el);
    const title = $el.find('h3[class*="title"]').text().trim();
    const company = $el.find('p[class*="company-name"]').text().trim();
    const href = $el.attr('href') ?? '';
    const url = `https://www.rallit.com${href}`;

    let career = '';
    let location = '';
    const $sep = $el.find('[role="separator"]');
    if ($sep.length) {
      const $span = $sep.parent();
      career = $span.find('p').filter((_, e) => $(e).text().trim() !== '').first().text().trim();
      location = $span.contents().filter((_, node) => node.type === 'text' && $(node).text().trim() !== '').text().trim();
    }

    console.log(`[${i+1}] title="${title}" | company="${company}" | career="${career}" | location="${location}"`);
    console.log(`     url=${url}`);
  });

  await browser.close();
}
main().catch(console.error);
