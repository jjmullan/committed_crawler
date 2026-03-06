// collectio.co.kr 메인 페이지 크롤러
// 수집 데이터: 섹션별 영화 목록 (제목, 감독, 연도, 러닝타임, 평점, 포스터)

import { chromium } from 'playwright';
import { z } from 'zod';

const BASE_URL = 'https://collectio.co.kr/main/index.jsp';

// ────────────────────────────────────────────
// 스키마 정의
// ────────────────────────────────────────────

export const MovieSchema = z.object({
  /** 섹션명 (Just Arrived / Now Trending / Spotlight / Director's Archive) */
  section: z.string(),
  /** 영화 제목 */
  title: z.string().min(1),
  /** 감독 */
  director: z.string(),
  /** 개봉 연도 */
  year: z.string(),
  /** 러닝타임 */
  runtime: z.string(),
  /** 관람 등급 (12 / 15 / 19) */
  rating: z.string(),
  /** 포스터 이미지 URL */
  posterUrl: z.string().url(),
});

export type Movie = z.infer<typeof MovieSchema>;

// ────────────────────────────────────────────
// 파싱 헬퍼
// ────────────────────────────────────────────

/**
 * "제목 ｜ 감독｜연도｜러닝타임" 형식의 텍스트를 파싱합니다.
 * 구분자가 일반 파이프(|)와 전각 파이프(｜) 두 가지로 혼용됩니다.
 */
function parseInfoText(text: string): { title: string; director: string; year: string; runtime: string } {
  const parts = text.split(/[|｜]/).map(s => s.trim()).filter(Boolean);

  return {
    title: parts[0] ?? '',
    director: parts[1] ?? '',
    year: parts[2] ?? '',
    runtime: parts[3] ?? '',
  };
}

// ────────────────────────────────────────────
// 크롤러
// ────────────────────────────────────────────

/**
 * collectio.co.kr 메인 페이지를 크롤링하여 전체 섹션의 영화 목록을 반환합니다.
 */
export async function crawlCollectio(): Promise<{ movies: Movie[]; errors: unknown[] }> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // 이미지·폰트 차단으로 속도 향상 (단, 포스터 URL은 img.getAttribute('src')로 추출하므로 차단해도 무방)
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'font') {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });

    // Slick 슬라이더 초기화 대기
    await page.waitForSelector('.slick-initialized', { timeout: 10000 });

    // ── 브라우저 컨텍스트 내에서 데이터 추출 ──
    const rawItems = await page.evaluate(() => {
      const results: {
        section: string;
        infoText: string;
        rating: string;
        posterUrl: string;
      }[] = [];

      // 각 슬라이더(섹션)를 순회
      const sliders = Array.from(document.querySelectorAll('.slick-initialized'));

      for (const slider of sliders) {
        // 상위 DOM에서 섹션 제목 탐색
        let sectionTitle = '알 수 없는 섹션';
        let parent = slider.parentElement;
        for (let i = 0; i < 6; i++) {
          if (!parent) break;
          const titleEl = parent.querySelector('h2, h3, h4, .tit, .title');
          if (titleEl?.textContent?.trim()) {
            sectionTitle = titleEl.textContent.trim();
            break;
          }
          parent = parent.parentElement;
        }

        // slick-cloned(무한 루프용 복제본) 제외한 실제 아이템만 수집
        const items = Array.from(
          slider.querySelectorAll<HTMLElement>('.item.mob_pop_btn:not(.slick-cloned)')
        );

        for (const item of items) {
          // 제목·감독·연도·러닝타임 텍스트
          const pTags = Array.from(item.querySelectorAll('p'));
          const infoText =
            pTags.find(p => p.textContent?.includes('｜') || p.textContent?.includes('|'))
              ?.textContent?.trim() ?? '';

          // 관람 등급
          const rating =
            item.querySelector('.right_tag li span')?.textContent?.trim() ?? '';

          // 포스터 이미지 (첫 번째 img)
          const posterUrl = item.querySelector('img')?.getAttribute('src') ?? '';

          if (infoText) {
            results.push({ section: sectionTitle, infoText, rating, posterUrl });
          }
        }
      }

      return results;
    });

    // ── Transform: 파싱 + Zod 검증 ──
    const movies: Movie[] = [];
    const errors: unknown[] = [];

    for (const raw of rawItems) {
      const { title, director, year, runtime } = parseInfoText(raw.infoText);

      const parsed = MovieSchema.safeParse({
        section: raw.section,
        title,
        director,
        year,
        runtime,
        rating: raw.rating,
        posterUrl: raw.posterUrl,
      });

      if (parsed.success) {
        movies.push(parsed.data);
      } else {
        errors.push({ raw, error: parsed.error.flatten() });
      }
    }

    return { movies, errors };
  } finally {
    await browser.close();
  }
}
