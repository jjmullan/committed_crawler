import { z } from 'zod';

/** 수집된 채용공고 1건의 데이터 스키마 */
export const JobPostingSchema = z.object({
  /** 공고 제목 */
  title: z.string().min(1),
  /** 회사명 */
  company: z.string().min(1),
  /** 출처 사이트명 (원티드, 사람인 등) */
  source: z.string().min(1),
  /** 경력 요건 (신입, 1년, 2년 등) */
  career: z.string().optional(),
  /** 근무 위치 */
  location: z.string().optional(),
  /** 공고 상세 URL */
  url: z.string().url(),
  /** 공고 게시일 */
  postedAt: z.string().optional(),
});
