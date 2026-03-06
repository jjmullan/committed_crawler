// 원시 HTML을 파싱하고 데이터를 정제하는 모듈 (Transform 단계)
// cheerio: 서버에서 jQuery 문법으로 HTML을 파싱하는 라이브러리

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { z } from 'zod';
import type { CrawlError } from './types';

/** transform 함수의 반환 타입 */
interface TransformResult<T> {
  results: T[];
  errors: CrawlError[];
}

/**
 * HTML을 파싱하고 Zod 스키마로 각 항목을 검증합니다.
 *
 * @param html - extractHtml()로 수집한 원시 HTML
 * @param selector - 수집할 요소의 CSS 셀렉터
 * @param schema - 각 항목을 검증할 Zod 스키마
 * @param mapper - cheerio Element를 스키마 입력값으로 변환하는 함수
 */
export function transformItems<T>(
  html: string,
  selector: string,
  schema: z.ZodSchema<T>,
  mapper: (el: AnyNode, $: cheerio.CheerioAPI) => unknown,
): TransformResult<T> {
  const $ = cheerio.load(html);
  const results: T[] = [];
  const errors: CrawlError[] = [];

  $(selector).each((_, el) => {
    const raw = mapper(el, $);
    const parsed = schema.safeParse(raw);

    if (parsed.success) {
      results.push(parsed.data);
    } else {
      errors.push({
        message: parsed.error.message,
        item: raw,
      });
    }
  });

  return { results, errors };
}
