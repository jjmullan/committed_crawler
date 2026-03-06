// Extract → Transform 파이프라인을 통합 실행하는 모듈

import { z } from 'zod';
import { extractHtml } from './extract';
import { transformItems } from './transform';
import type { CrawlOptions, CrawlPipelineResult } from './types';
import type { AnyNode } from 'domhandler';
import type { CheerioAPI } from 'cheerio';

/** 파이프라인 실행에 필요한 설정 */
interface PipelineConfig<T> {
  /** 크롤링 옵션 (URL, 대기 셀렉터 등) */
  crawlOptions: CrawlOptions;
  /** 수집할 요소의 CSS 셀렉터 */
  itemSelector: string;
  /** 각 항목을 검증할 Zod 스키마 */
  schema: z.ZodSchema<T>;
  /** cheerio Element를 스키마 입력값으로 변환하는 함수 */
  mapper: (el: AnyNode, $: CheerioAPI) => unknown;
}

/**
 * 크롤링 파이프라인을 실행합니다.
 *
 * 1. Extract: Playwright로 JS 렌더링된 HTML 수집
 * 2. Transform: cheerio로 파싱 + Zod로 스키마 검증
 */
export async function runPipeline<T>(
  config: PipelineConfig<T>,
): Promise<CrawlPipelineResult<T>> {
  const { crawlOptions, itemSelector, schema, mapper } = config;

  try {
    // 1. Extract
    const raw = await extractHtml(crawlOptions);

    // 2. Transform
    const { results, errors } = transformItems(raw.html, itemSelector, schema, mapper);

    return {
      success: true,
      url: crawlOptions.url,
      data: results,
      errors,
      crawledAt: raw.crawledAt,
    };
  } catch (err) {
    return {
      success: false,
      url: crawlOptions.url,
      data: [],
      errors: [{ message: err instanceof Error ? err.message : String(err) }],
      crawledAt: new Date().toISOString(),
    };
  }
}
