import { z } from 'zod';

/** 크롤링 실행에 필요한 설정값 스키마 */
export const CrawlConfigSchema = z.object({
  /** 크롤링할 대상 페이지 URL */
  url: z.url('올바른 URL 형식이 아닙니다.'),
  /** 데이터를 추출할 CSS 셀렉터 (예: 'a', 'h2', '.product-name') */
  selector: z.string({ error: 'selector는 필수입니다.' }).min(1, 'selector는 비워둘 수 없습니다.'),
  /** 수집할 최대 항목 수. 미설정 시 전체 수집 */
  maxItems: z.number().int().positive().optional(),
  /** 크롤링 방식. static: fetch 기반, dynamic: playwright 기반 (기본값: 'static') */
  mode: z.enum(['static', 'dynamic']).optional(),
  /** 크롤링할 최대 페이지 수 (기본값: 1) */
  maxPages: z.number().int().positive().optional(),
  /** 페이지 간 요청 대기 시간 ms. 서버 부하 방지용 (기본값: 1000) */
  interval: z.number().int().nonnegative().optional(),
  /** 페이지 번호를 전달할 URL 쿼리 파라미터 이름 (기본값: 'page') */
  pageParam: z.string().min(1).optional(),
  /** 시작 페이지 번호 (기본값: 1) */
  startPage: z.number().int().positive().optional(),
});

/** 셀렉터로 추출된 개별 데이터 단위 스키마 */
export const ParsedItemSchema = z.object({
  /** 수집 순서 (0부터 시작) */
  index: z.number().int().nonnegative(),
  /** 요소의 텍스트 내용 */
  text: z.string().min(1),
  /** 요소의 href 속성값. a 태그가 아닌 경우 undefined */
  href: z.string().optional(),
});

/** 크롤링 실행 결과 스키마 */
export const CrawlResultSchema = z.object({
  /** 크롤링한 페이지 URL */
  url: z.url(),
  /** 파싱된 데이터 목록 */
  items: z.array(ParsedItemSchema),
  /** 수집된 총 항목 수 */
  total: z.number().int().nonnegative(),
  /** 크롤링 소요 시간 (ms) */
  duration: z.number().nonnegative(),
  /** 크롤링 실행 시각 (ISO 8601) */
  crawledAt: z.iso.datetime(),
  /** 크롤링 중 발생한 에러 메시지. 정상 완료 시 undefined */
  error: z.string().optional(),
});
