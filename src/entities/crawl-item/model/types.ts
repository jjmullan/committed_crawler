import type { z } from 'zod';
import type { CrawlConfigSchema, CrawlResultSchema, ParsedItemSchema } from './schema';

/** 크롤링 설정값 타입. CrawlConfigSchema에서 자동 추론 */
export type CrawlConfig = z.infer<typeof CrawlConfigSchema>;

/** 개별 파싱 데이터 타입. ParsedItemSchema에서 자동 추론 */
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

/** 크롤링 실행 결과 타입. CrawlResultSchema에서 자동 추론 */
export type CrawlResult = z.infer<typeof CrawlResultSchema>;
