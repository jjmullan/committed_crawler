import type { z } from 'zod';
import type { JobPostingSchema } from './schema';

/** 수집된 채용공고 1건 타입. JobPostingSchema에서 자동 추론 */
export type JobPosting = z.infer<typeof JobPostingSchema>;
