import { chromium } from 'playwright';
import { extractStatic } from '../src/features/crawl/api/static';
import { SITES } from '../src/features/crawl/config/sites';
import { sendDiscordNotification } from '../src/features/load/api/discord';
import { saveAllToNotion } from '../src/features/load/api/notion';
import type { JobPosting } from '../src/entities/job-posting';
import 'dotenv/config';

const CRAWL_TIMEOUT = 30_000;
const INTER_SITE_DELAY = 2_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function crawlSite(site: (typeof SITES)[number], browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<JobPosting[]> {
  let html: string;

  if (site.mode === 'dynamic') {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'ko-KR',
      extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8' },
    });
    const page = await context.newPage();
    // navigator.webdriver 속성 제거로 자동화 감지 우회
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    try {
      // 사이트별 waitUntil 설정 (기본값: domcontentloaded)
      await page.goto(site.url, { waitUntil: site.waitUntil ?? 'domcontentloaded', timeout: CRAWL_TIMEOUT });
      await page.waitForTimeout(3_000);
      html = await page.content();
    } finally {
      await page.close();
      await context.close();
    }
  } else {
    html = await extractStatic(site.url);
  }

  return site.mapper(html);
}

async function main() {
  console.log(`\n🚀 크롤링 시작 — ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

  const startTime = Date.now();
  const allJobs: JobPosting[] = [];
  const errors: { site: string; message: string }[] = [];

  // 헤드리스 브라우저 감지 우회를 위한 설정
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  for (const site of SITES) {
    process.stdout.write(`  ⏳ ${site.name} 수집 중...`);
    try {
      const jobs = await crawlSite(site, browser);
      allJobs.push(...jobs);
      console.log(` ✅ ${jobs.length}건`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      console.log(` ❌ 실패: ${message}`);
      errors.push({ site: site.name, message });
    }

    await delay(INTER_SITE_DELAY);
  }

  await browser.close();

  console.log(`\n📦 총 ${allJobs.length}건 수집 완료. Notion에 저장 중...\n`);
  const saved = await saveAllToNotion(allJobs);
  console.log(`  ✅ Notion 신규 저장: ${saved}건 (중복 제외)\n`);

  const duration = Date.now() - startTime;

  if (process.env.DISCORD_WEBHOOK_URL) {
    console.log('📣 Discord 알림 전송 중...');
    await sendDiscordNotification({ jobs: allJobs, saved, duration, errors });
    console.log('  ✅ 완료\n');
  } else {
    console.log('⚠️  DISCORD_WEBHOOK_URL 미설정 — Discord 알림 건너뜀\n');
  }

  console.log(`🏁 전체 소요 시간: ${(duration / 1000).toFixed(1)}초`);
}

main().catch((err) => {
  console.error('❌ 크롤링 실패:', err);
  process.exit(1);
});
