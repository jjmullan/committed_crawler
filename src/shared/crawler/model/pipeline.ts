import pLimit from 'p-limit';
import type { CrawlConfig, CrawlResult } from '@/entities/crawl-item';
import { extractDynamic } from '../api/dynamic';
import { extractStatic } from '../api/static';
import { buildPageUrl, delay } from '../lib/paginate';
import { parseHtml } from '../lib/parse';

// 동시 요청 최대 3개로 제한 (서버 부하 방지)
const limit = pLimit(3);

/**
 * Extract → Transform 순서로 크롤링 파이프라인을 실행하고 결과를 반환한다.
 * maxPages가 2 이상이면 pageParam 쿼리스트링을 증가시키며 다중 페이지를 수집한다.
 * 에러 발생 시 items는 빈 배열, error 필드에 메시지를 담아 반환한다.
 */
export async function runPipeline(config: CrawlConfig): Promise<CrawlResult> {
  const startTime = Date.now();

  const maxPages = config.maxPages ?? 1;
  const startPage = config.startPage ?? 1;
  const pageParam = config.pageParam ?? 'page';
  const intervalMs = config.interval ?? 1000;
  const extract = config.mode === 'dynamic' ? extractDynamic : extractStatic;

  try {
    const allItems: ReturnType<typeof parseHtml> = [];

    for (let page = startPage; page < startPage + maxPages; page++) {
      // 단일 페이지면 URL 그대로, 다중 페이지면 쿼리 파라미터 추가
      const pageUrl = maxPages === 1 ? config.url : buildPageUrl(config.url, pageParam, page);

      const html = await limit(() => extract(pageUrl));
      const items = parseHtml(html, config);
      allItems.push(...items);

      // 마지막 페이지 이후에는 딜레이 불필요
      const isLastPage = page === startPage + maxPages - 1;
      if (!isLastPage) await delay(intervalMs);
    }

    return {
      url: config.url,
      items: allItems,
      total: allItems.length,
      duration: Date.now() - startTime,
      crawledAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      url: config.url,
      items: [],
      total: 0,
      duration: Date.now() - startTime,
      crawledAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : '알 수 없는 오류',
    };
  }
}
