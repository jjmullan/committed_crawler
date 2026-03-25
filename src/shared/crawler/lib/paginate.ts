/**
 * 베이스 URL에 페이지 쿼리 파라미터를 추가하여 반환한다.
 * 이미 해당 파라미터가 존재하면 덮어쓴다.
 */
export function buildPageUrl(baseUrl: string, pageParam: string, page: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set(pageParam, String(page));
  return url.toString();
}

/** 주어진 시간(ms) 동안 실행을 일시 중단한다 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
