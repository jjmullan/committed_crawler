import { Client } from '@notionhq/client';
import type { JobPosting } from '@/entities/job-posting';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
// SDK v5에서 query/create는 data_source_id(collection ID)를 사용
const DATASOURCE_ID = process.env.NOTION_DATASOURCE_ID ?? '';

/**
 * Notion DB에서 동일한 URL의 공고가 존재하는지 확인한다.
 * 중복 저장 방지를 위해 저장 전 호출한다.
 */
async function isDuplicate(url: string): Promise<boolean> {
  const res = await notion.dataSources.query({
    data_source_id: DATASOURCE_ID,
    filter: { property: 'URL', url: { equals: url }, type: 'url' },
  });
  return res.results.length > 0;
}

/**
 * 채용공고 1건을 Notion 데이터베이스에 저장한다.
 * 이미 존재하는 URL이면 저장을 건너뛴다.
 */
export async function saveToNotion(job: JobPosting): Promise<boolean> {
  if (await isDuplicate(job.url)) return false;

  await notion.pages.create({
    parent: { data_source_id: DATASOURCE_ID },
    properties: {
      공고명: { title: [{ text: { content: job.title } }] },
      회사: { rich_text: [{ text: { content: job.company } }] },
      출처: { select: { name: job.source } },
      경력: { select: { name: job.career ?? '미기재' } },
      위치: { rich_text: [{ text: { content: job.location ?? '미기재' } }] },
      URL: { url: job.url },
      수집일: { date: { start: new Date().toISOString() } },
    },
  });

  return true;
}

/**
 * 채용공고 목록 전체를 Notion DB에 저장하고, 신규 저장 건수를 반환한다.
 */
export async function saveAllToNotion(jobs: JobPosting[]): Promise<number> {
  let saved = 0;

  for (const job of jobs) {
    try {
      const isNew = await saveToNotion(job);
      if (isNew) saved++;
    } catch (err) {
      console.error(`[Notion] 저장 실패: ${job.title} (${job.source})`, err);
    }
  }

  return saved;
}
