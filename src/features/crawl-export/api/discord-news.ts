import type { NewsArticle } from '@/entities/news-article';

interface NewsCrawlSummary {
  articles: NewsArticle[];
  duration: number;
  errors: { site: string; message: string }[];
}

// Discord 메시지 최대 길이
const MAX_MSG_LENGTH = 2000;

/**
 * 아티클 1건을 한 줄 텍스트로 변환한다.
 * 형식: • [제목](url)
 */
function toLine(article: NewsArticle): string {
  return `• [${article.title}](${article.url})`;
}

/**
 * 헤더와 줄 목록을 Discord 2000자 제한에 맞게 분할한다.
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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, flags: 4 }),
  });
  if (!res.ok) {
    throw new Error(`Discord Webhook 오류: ${res.status} ${res.statusText}`);
  }
}

/**
 * Forum 채널 Webhook으로 새 스레드를 생성하고 첫 메시지를 전송한다.
 * ?wait=true 응답의 channel_id가 생성된 스레드 ID다.
 *
 * 주의: DISCORD_NEWS_WEBHOOK_URL은 Forum 채널의 Webhook URL이어야 한다.
 * 대상 채널 ID: 1482682866461704212
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
 * 뉴스 크롤링 결과를 Discord Forum 채널에 전송한다.
 *
 * 구조:
 * 1. 날짜별 스레드 생성 + 요약 메시지 (출처별 수집 건수)
 * 2. 출처별 아티클 링크를 해당 스레드 내에 순차 전송
 *
 * 새 아티클이 0건이고 오류도 없으면 전송을 생략한다.
 */
export async function sendNewsDiscordNotification(summary: NewsCrawlSummary): Promise<void> {
  const webhookUrl = process.env.DISCORD_NEWS_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_NEWS_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');

  const now = new Date();
  const date = now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 출처별 수집 건수 집계
  const countBySource = summary.articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.source] = (acc[a.source] ?? 0) + 1;
    return acc;
  }, {});

  const siteLines = Object.entries(countBySource)
    .map(([source, count]) => `• ${source}: ${count}건`)
    .join('\n');

  const errorLines = summary.errors.length
    ? `\n⚠️ 오류 발생 사이트:\n${summary.errors.map((e) => `• ${e.site}: ${e.message}`).join('\n')}`
    : '';

  const summaryContent = [
    `**기술 뉴스 & 아티클 (총 ${summary.articles.length}건)**`,
    siteLines || '• 수집된 아티클 없음',
    errorLines,
  ]
    .filter(Boolean)
    .join('\n');

  // 1. 스레드 생성 + 요약 메시지 발송
  const threadName = `📰 ${date} 기술 뉴스`;
  const threadId = await createThread(webhookUrl, threadName, summaryContent);

  // 2. 출처별 아티클 링크를 스레드 내에 전송
  const articlesBySource = summary.articles.reduce<Record<string, NewsArticle[]>>((acc, a) => {
    if (!acc[a.source]) acc[a.source] = [];
    acc[a.source].push(a);
    return acc;
  }, {});

  for (const [source, articles] of Object.entries(articlesBySource)) {
    const header = `### 📌 ${source} (${articles.length}건)`;
    const lines = articles.map(toLine);
    const chunks = splitIntoChunks(header, lines);

    for (const chunk of chunks) {
      await post(webhookUrl, chunk, threadId);
    }
  }
}
