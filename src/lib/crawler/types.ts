// 크롤러 공통 타입 정의

/** 크롤링 요청 옵션 */
export interface CrawlOptions {
  /** 대상 URL */
  url: string;
  /** 페이지 로드 후 대기할 CSS 셀렉터 (React 렌더링 완료 기준) */
  waitForSelector?: string;
  /** 요청 타임아웃 (ms), 기본값 30000 */
  timeout?: number;
}

/** 크롤링 원시 결과 */
export interface RawCrawlResult {
  url: string;
  html: string;
  crawledAt: string;
}

/** 크롤링 파이프라인 실행 결과 */
export interface CrawlPipelineResult<T = unknown> {
  success: boolean;
  url: string;
  data: T[];
  errors: CrawlError[];
  crawledAt: string;
}

/** 크롤링 에러 */
export interface CrawlError {
  message: string;
  item?: unknown;
}
