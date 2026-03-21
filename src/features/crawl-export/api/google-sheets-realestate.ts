/**
 * 네이버 부동산 크롤링 결과를 Google Sheets에 저장하는 모듈
 * 인증: Service Account (서버 자동화, 브라우저 로그인 불필요)
 * 저장 방식:
 *   - 신규 매물: 새 행 append (수집일시 + 최종수집일시 모두 현재)
 *   - 기존 매물: 최종수집일시만 업데이트 (수집일시 유지)
 *   - 미수집 매물: 변경 없음 (최종수집일시 갱신 안 됨 → 판매 완료로 추정)
 *
 * 열 위치는 시트 1행의 헤더 텍스트를 읽어 동적으로 결정하므로
 * 헤더 순서가 바뀌어도 올바른 열에 데이터가 입력된다.
 */
import { google } from 'googleapis';
import type { RealEstateArticle } from '../../crawl-realestate/model/types';

/** 시트 헤더 행 */
const SHEET_HEADERS = [
  '단지번호',
  '단지명',
  '도/시',
  '구',
  '행정동',
  '세대수',
  '사용승인일',
  '용적률',
  '건폐율',
  '매물번호',
  '동',
  '층',
  '전체층',
  '향',
  '공급면적(㎡)',
  '전용면적(㎡)',
  '매물가격(만원)',
  '수집일시',
  '최종수집일시',
  '링크',
];

/**
 * ISO 문자열을 KST 기준 'YYYY. M. D 오전/오후 H:MM' 형태로 변환
 * 예: "2025-03-21T06:30:00.000Z" → "2025. 3. 21 오후 3:30"
 */
function formatKoreanDateTime(isoString: string): string {
  const date = new Date(isoString);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const hours = kst.getUTCHours();
  const minutes = kst.getUTCMinutes();
  const ampm = hours < 12 ? '오전' : '오후';
  const h = hours % 12 || 12;
  const m = String(minutes).padStart(2, '0');
  return `${year}. ${month}. ${day} ${ampm} ${h}:${m}`;
}

/**
 * 0-based 열 인덱스를 스프레드시트 열 문자로 변환
 * 예: 0 → 'A', 25 → 'Z', 26 → 'AA'
 */
function columnIndexToLetter(index: number): string {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/**
 * RealEstateArticle를 헤더 텍스트 → 값 맵으로 변환
 * 행 데이터 구성 시 헤더 순서에 따라 값을 꺼내는 데 사용
 */
function articleToFieldMap(a: RealEstateArticle, firstCrawledAt: string, lastCrawledAt: string): Record<string, unknown> {
  return {
    단지번호: a.complexNumber,
    단지명: a.complexName,
    '도/시': a.city,
    구: a.division,
    행정동: a.sector,
    세대수: a.totalHouseholdNumber,
    사용승인일: a.useApprovalDate,
    용적률: a.floorAreaRatio ?? '',
    건폐율: a.buildingCoverageRatio ?? '',
    매물번호: a.articleNumber,
    링크: a.articleUrl,
    동: a.dongName,
    층: a.floor,
    전체층: a.totalFloor,
    향: a.direction,
    '공급면적(㎡)': a.supplySpace,
    '전용면적(㎡)': a.exclusiveSpace,
    '매물가격(만원)': Math.round(a.dealPrice / 10_000),
    수집일시: firstCrawledAt,
    최종수집일시: lastCrawledAt,
  };
}

/** saveRealEstateToSheets 반환 타입 */
export interface SheetSaveResult {
  added: number; // 신규 추가된 행 수
  updated: number; // 최종수집일시가 갱신된 기존 매물 수
}

/**
 * RealEstateArticle 배열을 Google Sheets에 저장한다.
 * @param articles 저장할 매물 목록
 * @param crawledAt 수집 일시 (ISO 문자열)
 * @returns 신규 추가 수 + 갱신 수
 */
export async function saveRealEstateToSheets(articles: RealEstateArticle[], crawledAt: string): Promise<SheetSaveResult> {
  // 환경변수 검증
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_REALESTATE_SHEET_NAME ?? '부동산';

  if (!serviceAccountKeyRaw) {
    throw new Error('환경변수 GOOGLE_SERVICE_ACCOUNT_KEY 가 설정되지 않았습니다.');
  }
  if (!spreadsheetId) {
    throw new Error('환경변수 GOOGLE_SHEETS_SPREADSHEET_ID 가 설정되지 않았습니다.');
  }

  // Service Account 인증 초기화
  // .env 파일 저장 시 private_key의 \n 이 \\n 으로 이중 이스케이프될 수 있어 복원 처리
  const credentials = JSON.parse(serviceAccountKeyRaw) as { private_key?: string; [key: string]: unknown };
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const formattedDate = formatKoreanDateTime(crawledAt);

  // 시트 탭 존재 여부 확인 후 없으면 자동 생성
  const metaResponse = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetExists = metaResponse.data.sheets?.some((s) => s.properties?.title === sheetName);
  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  // 시트 전체 데이터 읽기
  const getResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:Z`,
  });
  const existingRows = getResponse.data.values ?? [];

  // 헤더 행이 없거나 최신 형태가 아니면 (재)작성
  const headerRow = existingRows[0] ?? [];
  if (!SHEET_HEADERS.every((h) => headerRow.includes(h))) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [SHEET_HEADERS] },
    });
    // 헤더를 방금 썼으므로 로컬 headerRow도 동기화
    existingRows[0] = SHEET_HEADERS;
  }

  if (articles.length === 0) {
    return { added: 0, updated: 0 };
  }

  // 헤더 텍스트 → 열 인덱스 맵 생성
  const headerMap = new Map<string, number>((existingRows[0] as string[]).map((text, i) => [text, i]));

  const articleNumberCol = headerMap.get('매물번호');
  const lastCrawledCol = headerMap.get('최종수집일시');

  if (articleNumberCol === undefined || lastCrawledCol === undefined) {
    throw new Error('시트 헤더에서 필수 컬럼(매물번호, 최종수집일시)을 찾을 수 없습니다.');
  }

  const lastCrawledColLetter = columnIndexToLetter(lastCrawledCol);

  // 기존 매물번호 → 시트 행 번호(1-based) 맵 생성 (헤더 행 제외)
  const articleRowMap = new Map<string, number>();
  for (let i = 1; i < existingRows.length; i++) {
    const articleNumber = existingRows[i][articleNumberCol];
    if (articleNumber) {
      articleRowMap.set(String(articleNumber), i + 1); // +1: 시트는 1-based
    }
  }

  const newArticles: RealEstateArticle[] = [];
  const updateRanges: { range: string; values: string[][] }[] = [];

  for (const a of articles) {
    const existingSheetRow = articleRowMap.get(a.articleNumber);
    if (existingSheetRow !== undefined) {
      // 기존 매물: 최종수집일시 열만 업데이트
      updateRanges.push({
        range: `${sheetName}!${lastCrawledColLetter}${existingSheetRow}`,
        values: [[formattedDate]],
      });
    } else {
      newArticles.push(a);
    }
  }

  // 기존 매물 최종수집일시 일괄 업데이트
  if (updateRanges.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateRanges,
      },
    });
  }

  // 신규 매물 append — 헤더 순서에 따라 동적으로 행 구성
  if (newArticles.length > 0) {
    const rows = newArticles.map((a) => {
      const fieldMap = articleToFieldMap(a, formattedDate, formattedDate);
      return (existingRows[0] as string[]).map((header) => fieldMap[header] ?? '');
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  }

  return { added: newArticles.length, updated: updateRanges.length };
}
