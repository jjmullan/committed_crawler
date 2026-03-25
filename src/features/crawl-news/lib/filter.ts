/** 사이트별 날짜 필터 창 */
export type FilterWindow = '24h' | '7d' | '31d';

const WINDOW_MS: Record<FilterWindow, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '31d': 31 * 24 * 60 * 60 * 1000,
};

/**
 * publishedAt이 filterWindow 이내인지 검사한다.
 * - 24h: 최근 24시간 (매일 오전 10시 실행 → 전일 10시 ~ 오늘 10시)
 * - 7d: 최근 7일 (뭐지 — 주간 업데이트)
 * - 31d: 최근 31일 (네이버 FE — 월간 업데이트)
 */
export function isWithinWindow(publishedAt: string, window: FilterWindow): boolean {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return false;
  const from = new Date(Date.now() - WINDOW_MS[window]);
  return date >= from;
}

/**
 * 한국어 상대 시간 텍스트를 절대 ISO 문자열로 변환한다.
 * 예: "3시간 전" → ISO, "어제" → ISO
 * 변환 불가 시 null 반환
 */
export function parseRelativeKoreanDate(text: string): string | null {
  const now = Date.now();

  const minuteMatch = text.match(/(\d+)\s*분\s*전/);
  if (minuteMatch) return new Date(now - Number(minuteMatch[1]) * 60 * 1000).toISOString();

  const hourMatch = text.match(/(\d+)\s*시간\s*전/);
  if (hourMatch) return new Date(now - Number(hourMatch[1]) * 60 * 60 * 1000).toISOString();

  const dayMatch = text.match(/(\d+)\s*일\s*전/);
  if (dayMatch) return new Date(now - Number(dayMatch[1]) * 24 * 60 * 60 * 1000).toISOString();

  if (text.includes('어제')) return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (text.includes('오늘')) return new Date(now).toISOString();

  return null;
}

/**
 * 다양한 날짜 형식을 ISO 문자열로 파싱한다.
 * - ISO: "2025-03-15T10:00:00"
 * - 점 구분: "2025.03.15"
 * - 슬래시 구분: "2025/03/15"
 * - 한국어 상대: "3시간 전", "어제"
 * 변환 불가 시 null 반환
 */
export function parseDate(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();

  // 점/슬래시 구분자를 하이픈으로 치환 후 Date 파싱 시도
  const normalized = trimmed.replace(/\./g, '-').replace(/\//g, '-').replace(/-$/, '');
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  // 한국어 상대 시간
  return parseRelativeKoreanDate(trimmed);
}
