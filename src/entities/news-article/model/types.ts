import type { z } from 'zod';
import type { NewsArticleSchema } from './schema';

/** 수집된 뉴스/아티클 1건 타입. NewsArticleSchema에서 자동 추론 */
export type NewsArticle = z.infer<typeof NewsArticleSchema>;
