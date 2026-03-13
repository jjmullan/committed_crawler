import type { JobPosting } from '@/entities/job-posting';

interface CrawlSummary {
  jobs: JobPosting[];
  saved: number;
  duration: number;
  errors: { site: string; message: string }[];
}

/**
 * 크롤링 결과 요약을 Discord Webhook으로 전송한다.
 */
export async function sendDiscordNotification(summary: CrawlSummary): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');

  // 사이트별 수집 건수 집계
  const countBySite = summary.jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.source] = (acc[job.source] ?? 0) + 1;
    return acc;
  }, {});

  const siteLines = Object.entries(countBySite)
    .map(([site, count]) => `• ${site}: ${count}건`)
    .join('\n');

  const errorLines = summary.errors.length
    ? `\n⚠️ 오류 발생 사이트:\n${summary.errors.map((e) => `• ${e.site}: ${e.message}`).join('\n')}`
    : '';

  const content = [
    '## 📋 채용공고 크롤링 완료',
    `> 수집 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    `> 소요 시간: ${(summary.duration / 1000).toFixed(1)}초`,
    '',
    `**총 ${summary.jobs.length}건 수집 / Notion 신규 저장 ${summary.saved}건**`,
    '',
    '**사이트별 수집 현황**',
    siteLines,
    errorLines,
  ]
    .filter(Boolean)
    .join('\n');

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}
