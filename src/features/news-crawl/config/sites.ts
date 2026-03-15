import * as cheerio from 'cheerio';
import type { NewsArticle } from '@/entities/news-article';
import { parseDate } from '../lib/filter';
import type { FilterWindow } from '../lib/filter';

/** 뉴스 사이트별 크롤링 설정 */
export interface NewsSiteConfig {
  /** 출처 채널 표시명 */
  name: string;
  /** 날짜 필터 창: 24h(매일) | 7d(주간) | 31d(월간) */
  filterWindow: FilterWindow;
  /** static: fetch 기반 / dynamic: Playwright 기반 / github: GitHub Contents API */
  mode: 'static' | 'dynamic' | 'github';
  /** 크롤링 대상 URL */
  url: string;
  /** Playwright waitUntil 옵션 (dynamic 모드에서만 사용) */
  waitUntil?: 'domcontentloaded' | 'load';
  /**
   * 동기 파서: HTML/JSON을 파싱하여 아티클 목록 반환.
   * source는 pipeline에서 주입하므로 Omit.
   */
  mapper: (html: string) => Array<Omit<NewsArticle, 'source'>>;
  /**
   * 비동기 파서 (선택): 아티클별 개별 fetch가 필요한 사이트에서 사용.
   * 정의된 경우 mapper 대신 asyncMapper가 호출된다.
   */
  asyncMapper?: (html: string) => Promise<Array<Omit<NewsArticle, 'source'>>>;
}

// ─── 사이트별 파서 ────────────────────────────────────────────────────────────

/**
 * Geeknews (news.hada.io/new)
 * 구조 (2026-03 확인):
 *   div.topic_row                   (아이템 컨테이너)
 *   div.topictitle > a              (제목 텍스트 + 외부 URL — 사용 안 함)
 *   div.topictitle > a > h1         (제목 텍스트)
 *   div.topicinfo a[href^="topic?id="] (Geeknews 내부 토픽 링크)
 *   div.topicinfo                   (날짜: "10시간전", "2일전" 등 상대 시간 텍스트)
 */
function parseGeeknews(html: string): Array<Omit<NewsArticle, 'source'>> {
  const $ = cheerio.load(html);
  const items: Array<Omit<NewsArticle, 'source'>> = [];

  $('.topic_row').each((_, el) => {
    const $el = $(el);
    const title = ($el.find('.topictitle a h1').text() || $el.find('.topictitle a').text()).trim();

    // 외부 URL 대신 Geeknews 내부 토픽 페이지 링크 사용
    // topicinfo 내 <a href="topic?id=27516&go=comments"> 에서 id 추출
    const topicHref = $el.find('.topicinfo a[href^="topic?id="]').attr('href') ?? '';
    const topicIdMatch = topicHref.match(/topic\?id=(\d+)/);
    if (!topicIdMatch) return;
    const url = `https://news.hada.io/topic?id=${topicIdMatch[1]}`;

    // topicinfo 텍스트에서 상대 시간 파싱 ("10시간전", "2일전")
    const infoText = $el.find('.topicinfo').text().trim();
    const publishedAt = parseDate(infoText) ?? new Date().toISOString();

    if (title) items.push({ title, url, publishedAt });
  });

  return items;
}

/**
 * 요즘IT — RSS 아이템 기본 파싱 (title + url, pubDate 없음)
 * asyncMapper에서 각 아티클 상세 페이지의 JSON-LD로 날짜를 보완한다.
 */
function parseYozmITBase(xml: string): Array<{ title: string; url: string }> {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: Array<{ title: string; url: string }> = [];

  $('item').each((i, el) => {
    if (i >= 20) return false; // 최대 20건

    const $el = $(el);
    const title = $el.find('title').text().trim();
    const link = $el.find('link').text().trim() || $el.find('guid').text().trim();
    if (!title || !link) return;

    const url = link.endsWith('/') ? link : `${link}/`;
    items.push({ title, url });
  });

  return items;
}

/**
 * 요즘IT 아티클 상세 페이지에서 JSON-LD의 datePublished를 추출한다.
 * 구조 (2026-03 확인):
 *   <script type="application/ld+json">
 *     {...,"datePublished":"2026-03-13T17:00:17+09:00",...}
 *   </script>
 */
function extractYozmPublishedAt(html: string): string | null {
  const match = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * 요즘IT (yozm.wishket.com/magazine/feed/)
 * RSS에 pubDate 없음 → 아티클 상세 페이지에서 datePublished 개별 추출 (asyncMapper)
 * p-limit으로 동시 요청 5개 제한
 */
async function asyncParseYozmIT(xml: string): Promise<Array<Omit<NewsArticle, 'source'>>> {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(5);
  const baseItems = parseYozmITBase(xml);

  const results = await Promise.all(
    baseItems.map((item) =>
      limit(async () => {
        try {
          const res = await fetch(item.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return null;
          const html = await res.text();
          const publishedAt = extractYozmPublishedAt(html);
          if (!publishedAt) return null;
          return { title: item.title, url: item.url, publishedAt };
        } catch {
          return null;
        }
      }),
    ),
  );

  return results.filter((r): r is Omit<NewsArticle, 'source'> => r !== null);
}

/**
 * 뭐지 (moji.or.kr/archive/)
 * 주간 뉴스레터 사이트 — filterWindow: '7d'
 * 구조 (2026-03 확인):
 *   div[onclick^="openNewsletter"]          (아이템 컨테이너, id="container" 중복 사용)
 *   p#title 또는 p 첫 번째               (제목: "185번째 뉴스레터 : 2026년 3월 11일(3월 2주차)")
 *   onclick="openNewsletter('26-3-2')"     (contentId → URL 구성)
 *   — href 없음, 날짜는 제목 텍스트에서 정규식으로 추출
 */
function parseMoji(html: string): Array<Omit<NewsArticle, 'source'>> {
  const $ = cheerio.load(html);
  const items: Array<Omit<NewsArticle, 'source'>> = [];

  $('[onclick^="openNewsletter"]').each((_, el) => {
    const $el = $(el);

    // onclick="openNewsletter('26-3-2')" → contentId 추출
    const onclick = $el.attr('onclick') ?? '';
    const contentIdMatch = onclick.match(/openNewsletter\('([^']+)'\)/);
    if (!contentIdMatch) return;
    const contentId = contentIdMatch[1];
    const url = `https://moji.or.kr/archive/login/?content=${contentId}`;

    // 제목 텍스트 — id="container"가 중복이므로 p 태그로 탐색
    const titleText = $el.find('p').first().text().trim();
    const title = titleText || `뭐지 뉴스레터 (${contentId})`;

    // 제목에서 날짜 추출: "2026년 3월 11일"
    const dateMatch = titleText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    let publishedAt: string;
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      // KST 09:00 기준으로 변환
      publishedAt = new Date(
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T09:00:00+09:00`,
      ).toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }

    items.push({ title, url, publishedAt });
  });

  return items;
}

/**
 * 토스 테크 (toss.tech/category/engineering?categoryIds=2105)
 * Next.js App Router + TanStack Query — static fetch 가능
 * HTML의 날짜는 렌더링되지 않으며, RSC 스트림 내 JSON이 \" 이스케이프 형태로 포함
 *
 * 구조 (2026-03 확인) — RSC 내 escaped JSON:
 *   \"key\":\"slug\",...(~100자)...\"publishedTime\":\"2026-02-26T14:49:00+09:00\"
 *   \"title\":\"...\", ...  (key 앞 ~2000자 이내)
 *
 * Step 1: key+publishedTime 쌍 추출 (인접, ~200자 이내)
 * Step 2: 각 쌍 앞에서 가장 가까운 title 역방향 탐색
 */
function parseTossTech(html: string): Array<Omit<NewsArticle, 'source'>> {
  const items: Array<Omit<NewsArticle, 'source'>> = [];

  // Step 1: \"key\":\"...\" + \"publishedTime\":\"...\" 쌍 추출 (200자 이내 인접)
  // 실제 HTML 내 이스케이프: \"key\":\"slug\"
  const pairPat = /\\"key\\":\\"([^"\\]{3,80}?)\\",[\s\S]{1,300}?\\"publishedTime\\":\\"([^"\\]+?)\\"/g;

  // Step 2: title 위치 사전 구성 (matchAll로 Biome 경고 회피)
  const titlePat = /\\"title\\":\\"([^"\\]+?)\\"/g;
  const titles: { pos: number; value: string }[] = [];
  for (const tm of html.matchAll(titlePat)) {
    titles.push({ pos: tm.index ?? 0, value: tm[1] });
  }

  for (const pm of html.matchAll(pairPat)) {
    const key = pm[1];
    const publishedTime = pm[2];
    const keyPos = pm.index ?? 0;

    // key 앞 3000자 이내에서 가장 가까운 title 역탐색
    const nearestTitle = titles
      .filter((t) => t.pos < keyPos && keyPos - t.pos < 3000)
      .sort((a, b) => b.pos - a.pos)[0];

    const title = nearestTitle?.value;
    if (!title) continue;

    // URL slug가 숫자만인 경우도 허용 (예: /article/45387)
    items.push({
      title,
      url: `https://toss.tech/article/${key}`,
      publishedAt: publishedTime,
    });
  }

  return items;
}


/**
 * 네이버 FE News (github.com/naver/fe-news/tree/master/issues)
 * GitHub Contents API 사용 — 월별 이슈 파일(YYYY-MM.md) 목록에서 최신 파일을 감지
 * filterWindow: '31d' — 월간 업데이트이므로 31일 이내 새 파일만 수집
 *
 * API 응답 예시:
 *   [{ name: "2025-03.md", type: "file", download_url: "..." }, ...]
 *
 * 파일명의 YYYY-MM을 게시일로 사용한다.
 * 실제 커밋 일시를 얻으려면 commits API 추가 호출이 필요하지만,
 * 월별 이슈 특성상 파일명 기준 월의 1일을 publishedAt으로 간주한다.
 */
function parseNaverFE(json: string): Array<Omit<NewsArticle, 'source'>> {
  const files = JSON.parse(json) as Array<{
    name: string;
    download_url: string | null;
    type: string;
  }>;

  // YYYY-MM.md 형식 파일만 추출, 내림차순 정렬(최신 우선)
  const issueFiles = files
    .filter((f) => f.type === 'file' && /^\d{4}-\d{2}\.md$/.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  const latest = issueFiles[0];
  if (!latest) return [];

  // "YYYY-MM.md" → publishedAt: 해당 월 1일 00:00 UTC
  const ym = latest.name.replace('.md', '');
  const [year, month] = ym.split('-');
  const publishedAt = new Date(`${year}-${month}-01T00:00:00Z`).toISOString();

  const url = `https://github.com/naver/fe-news/blob/master/issues/${latest.name}`;
  const title = `FE News ${year}년 ${Number(month)}월호`;

  return [{ title, url, publishedAt }];
}

// ─── 사이트 목록 ──────────────────────────────────────────────────────────────

export const NEWS_SITES: NewsSiteConfig[] = [
  {
    name: 'Geeknews',
    filterWindow: '24h',
    mode: 'static',
    url: 'https://news.hada.io/new',
    mapper: parseGeeknews,
  },
  {
    name: '요즘IT',
    filterWindow: '24h',
    // CSR 사이트라 HTML 크롤링 불가 — RSS 피드로 목록 수집 후
    // 아티클 상세 페이지에서 datePublished 개별 추출 (asyncMapper)
    mode: 'static',
    url: 'https://yozm.wishket.com/magazine/feed/',
    mapper: parseYozmITBase as unknown as (html: string) => Array<Omit<NewsArticle, 'source'>>,
    asyncMapper: asyncParseYozmIT,
  },
  {
    name: '뭐지',
    filterWindow: '7d',
    mode: 'static',
    url: 'https://moji.or.kr/archive/',
    mapper: parseMoji,
  },
  {
    name: '토스 테크',
    filterWindow: '7d',
    // RSC 스트림에 아티클 데이터 포함 — static fetch로 JSON 파싱
    mode: 'static',
    url: 'https://toss.tech/category/engineering?categoryIds=2105',
    mapper: parseTossTech,
  },
  {
    name: '네이버 FE',
    filterWindow: '31d',
    mode: 'github',
    url: 'https://api.github.com/repos/naver/fe-news/contents/issues',
    mapper: parseNaverFE,
  },
];
