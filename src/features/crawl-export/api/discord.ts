import type { JobPosting } from '@/entities/job-posting';

interface CrawlSummary {
  jobs: JobPosting[];
  duration: number;
  errors: { site: string; message: string }[];
}

// Discord 메시지 최대 길이
const MAX_MSG_LENGTH = 2000;

/**
 * 공고 1건을 한 줄 텍스트로 변환한다.
 * 형식: - [공고명](url) | 회사명 | 경력 | 위치
 */
function toLine(job: JobPosting): string {
  const career = job.career ?? '-';
  const location = job.location ?? '-';
  return `- [${job.title}](${job.url})  |  ${job.company}  |  ${career}  |  ${location}`;
}

/**
 * 헤더와 공고 줄 목록을 Discord 2000자 제한에 맞게 분할한다.
 * 첫 번째 청크에만 헤더가 포함된다.
 */
function splitIntoChunks(header: string, lines: string[]): string[] {
  const chunks: string[] = [];
  let current = header;

  for (const line of lines) {
    const next = `${current}\n${line}`;
    if (next.length > MAX_MSG_LENGTH) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Webhook URL로 단일 POST 요청을 전송한다.
 * threadId를 지정하면 해당 스레드 내에 전송한다.
 * flags: 4 (SUPPRESS_EMBEDS) — URL 링크 미리보기 억제
 */
async function post(webhookUrl: string, content: string, threadId?: string): Promise<void> {
  const url = threadId ? `${webhookUrl}?thread_id=${threadId}` : webhookUrl;

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, flags: 4 }),
    });

    if (res.status === 429) {
      const retryAfter = parseFloat(res.headers.get('retry-after') ?? '2');
      await new Promise((r) => setTimeout(r, (retryAfter + 0.5) * 1000));
      continue;
    }

    if (!res.ok) {
      throw new Error(`Discord Webhook 오류: ${res.status} ${res.statusText}`);
    }

    // 전송 성공 후 다음 요청 전 최소 간격 확보
    await new Promise((r) => setTimeout(r, 500));
    return;
  }

  throw new Error('Discord Webhook 오류: rate limit 재시도 초과');
}

/**
 * Forum 채널 Webhook으로 새 스레드를 생성하고 첫 메시지를 전송한다.
 * ?wait=true 응답의 channel_id가 생성된 스레드 ID다.
 *
 * 주의: DISCORD_WEBHOOK_URL은 Forum 채널의 Webhook URL이어야 한다.
 */
async function createThread(webhookUrl: string, threadName: string, content: string): Promise<string> {
  const res = await fetch(`${webhookUrl}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_name: threadName, content, flags: 4 }),
  });
  if (!res.ok) {
    throw new Error(`Discord 스레드 생성 실패: ${res.status} ${res.statusText}`);
  }
  const msg = (await res.json()) as { channel_id: string };
  return msg.channel_id;
}

/**
 * 크롤링 결과를 Discord Forum 채널에 전송한다.
 *
 * 구조:
 * 1. 날짜별 스레드 생성 + 요약 메시지 (수집 건수, 소요 시간, 오류 현황)
 * 2. 사이트별 공고 목록을 해당 스레드 내에 순차 전송
 */
export async function sendDiscordNotification(summary: CrawlSummary): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');

  const now = new Date();
  const date = now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 사이트별 수집 건수 집계
  const countBySite = summary.jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.source] = (acc[job.source] ?? 0) + 1;
    return acc;
  }, {});

  const siteLines = Object.entries(countBySite)
    .map(([site, count]) => `• ${site}: ${count}건`)
    .join('\n');

  const errorLines = summary.errors.length ? `\n⚠️ 오류 발생 사이트:\n${summary.errors.map((e) => `• ${e.site}: ${e.message}`).join('\n')}` : '';

  const summaryContent = [
    // `> 수집 시각: ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    // `> 소요 시간: ${(summary.duration / 1000).toFixed(1)}초`,
    `**사이트별 수집 현황 (총 ${summary.jobs.length}건) **`,
    siteLines,
    errorLines,
    '',
    `*참고: 사람인, 잡코리아, 잡플래닛, 커리어리, OKKY 등은 크롤링 대상에서 제외되어 있습니다.`,
  ]
    .filter(Boolean)
    .join('\n');

  // 1. 스레드 생성 + 요약 메시지 발송
  const threadName = `📋 ${date} 채용 공고`;
  const threadId = await createThread(webhookUrl, threadName, summaryContent);

  // 2. 사이트별 공고 목록을 스레드 내에 전송
  const jobsBySite = summary.jobs.reduce<Record<string, JobPosting[]>>((acc, job) => {
    if (!acc[job.source]) acc[job.source] = [];
    acc[job.source].push(job);
    return acc;
  }, {});

  for (const [site, jobs] of Object.entries(jobsBySite)) {
    const header = `### 📌 ${site} (${jobs.length}건)`;
    const lines = [...jobs].sort((a, b) => a.company.localeCompare(b.company, 'ko')).map(toLine);
    const chunks = splitIntoChunks(header, lines);

    for (const chunk of chunks) {
      await post(webhookUrl, chunk, threadId);
    }
  }
}
