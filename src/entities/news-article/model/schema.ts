import { z } from 'zod';

/** 수집된 뉴스/아티클 1건의 데이터 스키마 */
export const NewsArticleSchema = z.object({
  /** 아티클 제목 */
  title: z.string().min(1),
  /** 원문 링크 */
  url: z.string().url(),
  /** 출처 채널명 (Geeknews, 요즘IT 등) */
  source: z.string().min(1),
  /** 게시일 (ISO 8601 문자열) */
  publishedAt: z.string(),
});
