import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const sites = [
  { name: '사람인', url: 'https://www.saramin.co.kr/zf_user/jobs/list/job-category?cat_kewd=87%2C88&search_done=y&preview=y' },
  { name: '잡코리아', url: 'https://www.jobkorea.co.kr/recruit/joblist?menucode=duty&dutyCtgr1=10&dutyCtgr2=230' },
  { name: '랠릿', url: 'https://www.rallit.com/?job=FRONTEND_DEVELOPER&jobGroup=DEVELOPER' },
  { name: '서핏', url: 'https://jobs.surfit.io/develop/front-end' },
  { name: 'OKKY', url: 'https://jobs.okky.kr/contract?duty%5B0%5D=40&duty%5B1%5D=36&minCareer=0' },
];

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });

for (const site of sites) {
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 공고 목록 링크 3개와 텍스트 샘플
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const jobLinks = anchors.filter(a => {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim();
        return text.length > 5 && text.length < 200 && (href.includes('job') || href.includes('position') || href.includes('recruit') || href.includes('wd') || href.includes('jobs'));
      });
      return jobLinks.slice(0, 3).map(a => ({ href: a.getAttribute('href'), text: (a.textContent || '').trim().slice(0, 150) }));
    });

    console.log(`\n=== ${site.name} ===`);
    console.log('HTML length:', (await page.content()).length);
    links.forEach((l, i) => console.log(`  [${i}] href: ${l.href}\n      text: ${l.text.replace(/\n/g, ' | ')}`));
  } catch (e) {
    console.log(`\n=== ${site.name} === ERROR: ${e.message.slice(0, 80)}`);
  }

  await context.close();
}

await browser.close();
