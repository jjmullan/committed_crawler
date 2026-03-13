// 원티드·랠릿 파서 단독 테스트
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseWanted(html) {
  const $ = cheerio.load(html);
  const jobs = [];
  $('li a[href*="/wd/"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('[class*="body__position"]').text().trim();
    const company = $el.find('[class*="__company__"]').text().trim();
    const locationRaw = $el.find('[class*="__location__"]').text().trim();
    const [location, career] = locationRaw.split(' · ');
    const href = $el.attr('href') ?? '';
    const url = `https://www.wanted.co.kr${href}`;
    if (title && company) jobs.push({ title, company, location: location?.trim(), career: career?.trim(), url, source: '원티드' });
  });
  return jobs;
}

function parseRallit(html) {
  const $ = cheerio.load(html);
  const jobs = [];
  $('a[href*="/positions/"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('h3[class*="title"]').text().trim();
    const company = $el.find('p[class*="company-name"]').text().trim();
    const href = $el.attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://www.rallit.com${href}`;
    if (title && company) jobs.push({ title, company, url, source: '랠릿' });
  });
  return jobs;
}

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });

for (const site of [
  { name: '원티드', url: 'https://www.wanted.co.kr/wdlist/518/669?country=kr&job_sort=job.latest_order&years=0&years=2&locations=all', parser: parseWanted },
  { name: '랠릿', url: 'https://www.rallit.com/?job=FRONTEND_DEVELOPER&jobGroup=DEVELOPER&pageNumber=1', parser: parseRallit },
]) {
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  const html = await page.content();
  const jobs = site.parser(html);
  console.log(`\n=== ${site.name} → ${jobs.length}건 ===`);
  jobs.slice(0, 3).forEach(j => console.log(`  • [${j.company}] ${j.title} | ${j.career ?? ''} | ${j.location ?? ''}`));
  await context.close();
}

await browser.close();
