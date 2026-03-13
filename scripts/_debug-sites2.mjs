import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const sites = [
  { name: '점핏', url: 'https://jumpit.saramin.co.kr/positions?jobCategory=2&career=0&sort=popular' },
  { name: '그룹바이', url: 'https://groupby.kr/positions?careerTypes=1&positionTypes=1' },
  { name: '잡플래닛', url: 'https://www.jobplanet.co.kr/job' },
  { name: '커리어리', url: 'https://www.careerly.co.kr/job?title=%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C' },
];

const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });

for (const site of sites) {
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const info = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const jobLinks = anchors.filter(a => {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim();
        return text.length > 5 && text.length < 200;
      });
      return {
        htmlLen: document.documentElement.outerHTML.length,
        samples: jobLinks.slice(0, 3).map(a => ({
          href: a.getAttribute('href'),
          text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
        })),
      };
    });

    console.log(`\n=== ${site.name} === (len: ${info.htmlLen})`);
    info.samples.forEach((l, i) => console.log(`  [${i}] ${l.href}\n      ${l.text}`));
  } catch (e) {
    console.log(`\n=== ${site.name} === ERROR: ${e.message.slice(0, 100)}`);
  }

  await context.close();
}

await browser.close();
