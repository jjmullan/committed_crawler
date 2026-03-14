import { chromium } from 'playwright';
import { extractStatic } from '../src/features/crawl/api/static';
import { SITES } from '../src/features/crawl/config/sites';
import { buildPageUrl } from '../src/features/crawl/lib/paginate';
import { sendDiscordNotification } from '../src/features/load/api/discord';
import type { JobPosting } from '../src/entities/job-posting';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CRAWL_TIMEOUT = 30_000;
const INTER_SITE_DELAY = 2_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Browser = Awaited<ReturnType<typeof chromium.launch>>;

/** 단일 URL을 로드하고 HTML 문자열을 반환한다 */
async function fetchHtml(url: string, site: (typeof SITES)[number], browser: Browser): Promise<string> {
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
      await page.goto(url, { waitUntil: site.waitUntil ?? 'domcontentloaded', timeout: CRAWL_TIMEOUT });
      await page.waitForTimeout(3_000);

      // 무한 스크롤 처리 — 높이 변화 없으면 조기 종료
      if (site.scrollOptions) {
        const { maxScrolls, waitMs } = site.scrollOptions;
        for (let i = 0; i < maxScrolls; i++) {
          const prevHeight: number = await page.evaluate(() => document.body.scrollHeight);
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(waitMs);
          const newHeight: number = await page.evaluate(() => document.body.scrollHeight);
          if (newHeight === prevHeight) break;
        }
      }

      return await page.content();
    } finally {
      await page.close();
      await context.close();
    }
  }
  if (site.mode === 'api') {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
  return extractStatic(url);
}

async function crawlSite(site: (typeof SITES)[number], browser: Browser): Promise<JobPosting[]> {
  // 페이지네이션 없으면 단일 페이지
  if (!site.pagination) {
    const html = await fetchHtml(site.url, site, browser);
    return site.mapper(html);
  }

  // 페이지네이션: pageParam을 순차 증가시키며 로드, 빈 결과면 조기 종료
  const { pageParam, maxPages, waitMs = 3_000, startValue = 1, step = 1 } = site.pagination;
  const allJobs: JobPosting[] = [];

  for (let p = 0; p < maxPages; p++) {
    const pageUrl = buildPageUrl(site.url, pageParam, startValue + p * step);
    const html = await fetchHtml(pageUrl, site, browser);
    const jobs = site.mapper(html);
    if (jobs.length === 0) break;
    allJobs.push(...jobs);
    if (p < maxPages - 1) await delay(waitMs);
  }

  return allJobs;
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

  const duration = Date.now() - startTime;

  console.log(`\n📦 총 ${allJobs.length}건 수집 완료. Discord로 전송 중...\n`);
  await sendDiscordNotification({ jobs: allJobs, duration, errors });
  console.log('  ✅ 완료\n');

  console.log(`🏁 전체 소요 시간: ${(duration / 1000).toFixed(1)}초`);
}

main().catch((err) => {
  console.error('❌ 크롤링 실패:', err);
  process.exit(1);
});
