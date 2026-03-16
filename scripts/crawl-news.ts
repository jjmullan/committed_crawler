import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NEWS_SITES } from '../src/features/news-crawl/config/sites';
import { isWithinWindow } from '../src/features/news-crawl/lib/filter';
import { sendNewsDiscordNotification } from '../src/features/load/api/discord-news';
import type { NewsArticle } from '../src/entities/news-article';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const CRAWL_TIMEOUT = 30_000;
const INTER_SITE_DELAY = 2_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Browser = Awaited<ReturnType<typeof chromium.launch>>;

/**
 * 사이트 mode에 따라 HTML 또는 JSON 문자열을 반환한다.
 * - static: fetch 기반 HTML 수집
 * - dynamic: Playwright Chromium 기반 렌더링
 * - github: GitHub Contents API (JSON)
 */
async function fetchContent(
  url: string,
  mode: (typeof NEWS_SITES)[number]['mode'],
  browser: Browser,
  waitUntil?: 'domcontentloaded' | 'load',
): Promise<string> {
  if (mode === 'github') {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'webcrawl-news-bot',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(CRAWL_TIMEOUT),
    });
    if (!res.ok) throw new Error(`GitHub API 오류: ${res.status} ${res.statusText}`);
    return res.text();
  }

  if (mode === 'dynamic') {
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
      await page.goto(url, { waitUntil: waitUntil ?? 'domcontentloaded', timeout: CRAWL_TIMEOUT });
      await page.waitForTimeout(3_000);
      return await page.content();
    } finally {
      await page.close();
      await context.close();
    }
  }

  // static: fetch 기반
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    signal: AbortSignal.timeout(CRAWL_TIMEOUT),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

async function main() {
  console.log(`\n🚀 뉴스 크롤링 시작 — ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

  const startTime = Date.now();
  const allArticles: NewsArticle[] = [];
  const errors: { site: string; message: string }[] = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  for (const site of NEWS_SITES) {
    process.stdout.write(`  ⏳ ${site.name} 수집 중 (필터: ${site.filterWindow})...`);
    try {
      const content = await fetchContent(site.url, site.mode, browser, site.waitUntil);

      // asyncMapper 우선, 없으면 동기 mapper 사용
      const raw = site.asyncMapper ? await site.asyncMapper(content) : site.mapper(content);

      // 날짜 필터 적용 후 source 주입
      const filtered = raw
        .filter((a) => isWithinWindow(a.publishedAt, site.filterWindow))
        .map((a) => ({ ...a, source: site.name }));

      allArticles.push(...filtered);
      console.log(` ✅ ${filtered.length}건 (전체 파싱: ${raw.length}건)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      console.log(` ❌ 실패: ${message}`);
      errors.push({ site: site.name, message });
    }

    await delay(INTER_SITE_DELAY);
  }

  await browser.close();

  const duration = Date.now() - startTime;

  // 새 아티클도 없고 오류도 없으면 Discord 전송 생략
  if (allArticles.length === 0 && errors.length === 0) {
    console.log('\n📭 새 아티클 없음. Discord 전송 생략.\n');
    console.log(`🏁 전체 소요 시간: ${(duration / 1000).toFixed(1)}초`);
    return;
  }

  // 결과를 프로젝트 루트에 JSON으로 저장 (매 실행 시 초기화)
  const outputPath = resolve(process.cwd(), 'news-crawl-result.json');
  writeFileSync(
    outputPath,
    JSON.stringify({ crawledAt: new Date().toISOString(), total: allArticles.length, articles: allArticles }, null, 2),
    'utf-8',
  );
  console.log(`\n💾 JSON 저장 완료: ${outputPath}`);

  console.log(`\n📦 총 ${allArticles.length}건 수집 완료. Discord로 전송 중...\n`);
  await sendNewsDiscordNotification({ articles: allArticles, duration, errors });
  console.log('  ✅ 완료\n');

  console.log(`🏁 전체 소요 시간: ${(duration / 1000).toFixed(1)}초`);
}

main().catch((err) => {
  console.error('❌ 뉴스 크롤링 실패:', err);
  process.exit(1);
});
