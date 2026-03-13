/** 크롤러 기본 설정값 */
export const CRAWLER_CONFIG = {
  /** fetch 요청 타임아웃 (ms) */
  timeout: 10_000,
  /** 요청 식별을 위한 User-Agent 헤더값 (HTTP 헤더는 ASCII만 허용) */
  userAgent: 'webcrawl-bot/1.0 (learning-purpose crawler)',
} as const;
