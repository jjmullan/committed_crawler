# 웹 크롤러 구현 계획 (PLAN.md)

> 작성일: 2026-03-13
> 목적: 웹 크롤링 기술을 처음부터 직접 구현하며 학습

---

## 1. 크롤링 방식의 종류와 선택

### 1-1. 정적 크롤링 (Static Crawling)

HTML을 서버로부터 그대로 받아와서 파싱하는 방식.
JavaScript가 실행되지 않은 상태의 HTML을 수집한다.

**사용 도구**
| 도구 | 역할 | 특징 |
|------|------|------|
| `fetch` (Node.js 내장) | HTTP 요청 | 별도 설치 불필요, 가장 기본 |
| `axios` | HTTP 요청 | 인터셉터, 타임아웃 등 편의 기능 |
| `cheerio` | HTML 파싱 | jQuery 문법으로 DOM 탐색 |

**적합한 대상**: 서버 사이드 렌더링(SSR) 사이트, 일반 HTML 문서

---

### 1-2. 동적 크롤링 (Dynamic Crawling)

실제 브라우저를 실행하여 JavaScript까지 렌더링한 뒤 HTML을 수집하는 방식.
SPA(React, Vue 등)처럼 클라이언트에서 데이터를 로드하는 사이트에 필요하다.

**사용 도구**
| 도구 | 역할 | 특징 |
|------|------|------|
| `playwright` | 브라우저 자동화 | Chromium/Firefox/WebKit 지원, 안정적 |
| `puppeteer` | 브라우저 자동화 | Chrome 전용, 가볍지만 기능 제한 |

**적합한 대상**: React/Vue/Angular SPA, 무한 스크롤, 로그인 필요 사이트

---

### 선택 전략 (이 프로젝트의 방향)

```
정적 크롤링 우선 → 실패하면 동적 크롤링으로 전환
```

- **1단계**: `fetch` + `cheerio` 로 정적 크롤링 구현 (빠르고 가벼움)
- **2단계**: `playwright` 로 동적 크롤링 구현 (JS 렌더링 필요 시)
- **3단계**: 두 방식을 선택적으로 사용하는 통합 파이프라인

---

## 2. 아키텍처 설계 (ETL 패턴)

크롤링은 **ETL(Extract → Transform → Load)** 패턴으로 구성한다.

```
[Extract]         [Transform]        [Load]
HTML 수집    →    데이터 파싱    →    저장/출력
(fetch/playwright)  (cheerio/zod)    (JSON/DB/API)
```

### 각 단계 책임

| 단계 | 역할 | 주요 작업 |
|------|------|----------|
| **Extract** | 원본 데이터 수집 | URL 요청, HTML 가져오기, 오류 처리 |
| **Transform** | 데이터 가공 | DOM 파싱, 필드 추출, 타입 검증 |
| **Load** | 데이터 저장 | JSON 파일, API 응답, DB 저장 |

---

## 3. 폴더 구조

```
src/
├── app/
│   ├── api/
│   │   └── crawl/
│   │       └── route.ts          ← POST /api/crawl 엔드포인트
│   ├── page.tsx                  ← 크롤링 UI (입력 폼 + 결과 출력)
│   └── layout.tsx
│
└── lib/
    └── crawler/
        ├── types.ts              ← 공통 타입 정의 (CrawlConfig, CrawlResult 등)
        ├── extract/
        │   ├── static.ts         ← fetch + cheerio 기반 정적 추출
        │   └── dynamic.ts        ← playwright 기반 동적 추출
        ├── transform/
        │   ├── parser.ts         ← HTML에서 데이터 추출 (cheerio 셀렉터)
        │   └── validator.ts      ← zod 스키마 검증
        ├── load/
        │   └── json.ts           ← JSON 파일로 저장
        └── pipeline.ts           ← ETL 통합 실행 (runPipeline)
```

---

## 4. 단계별 구현 계획

### Phase 1 — 정적 크롤링 기초 (fetch + cheerio)

**목표**: 가장 단순한 형태의 크롤러를 동작시키는 것

**구현 순서**:
1. `types.ts` 작성 — `CrawlConfig`, `CrawlResult` 인터페이스 정의
2. `extract/static.ts` 작성 — `fetch`로 HTML 가져오기
3. `transform/parser.ts` 작성 — `cheerio`로 제목, 링크 등 파싱
4. `pipeline.ts` 작성 — Extract → Transform 연결
5. `app/api/crawl/route.ts` 작성 — Next.js API Route로 노출
6. 동작 확인 (curl 또는 브라우저)

**핵심 코드 예시**:
```ts
// extract/static.ts
export async function extractStatic(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': '...' } });
  return res.text(); // raw HTML
}

// transform/parser.ts
export function parse(html: string): Item[] {
  const $ = cheerio.load(html);
  return $('a').map((_, el) => ({ text: $(el).text(), href: $(el).attr('href') })).get();
}
```

---

### Phase 2 — 데이터 검증 (zod)

**목표**: 파싱된 데이터의 타입 안전성 확보

**구현 순서**:
1. `transform/validator.ts` 작성 — zod 스키마로 파싱 결과 검증
2. 검증 실패 시 에러 처리 로직 추가
3. `CrawlResult` 타입을 zod 스키마에서 infer

```ts
// transform/validator.ts
const ItemSchema = z.object({
  text: z.string().min(1),
  href: z.string().url().optional(),
});
export type Item = z.infer<typeof ItemSchema>;
```

---

### Phase 3 — 동적 크롤링 (playwright)

**목표**: JavaScript 렌더링이 필요한 SPA 사이트 크롤링

**구현 순서**:
1. playwright 설치 및 브라우저 바이너리 다운로드
2. `extract/dynamic.ts` 작성 — 브라우저 실행, 페이지 로드, HTML 수집
3. `pipeline.ts`에서 config에 따라 static/dynamic 자동 선택
4. 스크롤, 클릭 등 인터랙션 처리

```ts
// extract/dynamic.ts
export async function extractDynamic(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const html = await page.content();
  await browser.close();
  return html;
}
```

---

### Phase 4 — 다중 페이지 크롤링 (페이지네이션)

**목표**: 여러 페이지를 순차적으로 크롤링

**구현 순서**:
1. `pipeline.ts`에 반복 실행 로직 추가
2. `p-limit`으로 동시 요청 수 제한
3. 다음 페이지 URL 감지 (next 버튼 href, 쿼리스트링 증가 등)

```ts
// pipeline.ts (개념)
for (let page = 1; page <= maxPage; page++) {
  const url = config.baseUrl + `?page=${page}`;
  const html = await extract(url);
  const items = parse(html);
  results.push(...items);
  await delay(config.interval); // 서버 부하 방지
}
```

---

### Phase 5 — UI 연동

**목표**: 브라우저에서 크롤링을 실행하고 결과를 확인

**구현 순서**:
1. `app/page.tsx`에 URL 입력 폼 작성
2. `/api/crawl`로 POST 요청 → 결과 출력
3. 로딩 상태, 에러 상태 처리

---

## 5. 설치할 패키지 목록

| 패키지 | 용도 | 단계 |
|--------|------|------|
| `cheerio` | HTML 파싱 | Phase 1 |
| `zod` | 스키마 검증 | Phase 2 |
| `playwright` | 동적 크롤링 | Phase 3 |
| `p-limit` | 동시 요청 제한 | Phase 4 |

---

## 6. 구현 체크리스트

### Phase 1 — 정적 크롤링
- [ ] `types.ts` — CrawlConfig, CrawlResult 타입 정의
- [ ] `extract/static.ts` — fetch로 HTML 수집
- [ ] `transform/parser.ts` — cheerio로 데이터 파싱
- [ ] `pipeline.ts` — ETL 연결
- [ ] `app/api/crawl/route.ts` — API 엔드포인트

### Phase 2 — 데이터 검증
- [ ] `transform/validator.ts` — zod 스키마 정의 및 검증

### Phase 3 — 동적 크롤링
- [ ] `extract/dynamic.ts` — playwright 기반 추출
- [ ] pipeline에서 static/dynamic 자동 선택

### Phase 4 — 다중 페이지
- [ ] 페이지네이션 로직
- [ ] p-limit으로 동시 요청 제한
- [ ] 요청 간 딜레이

### Phase 5 — UI
- [ ] URL 입력 폼
- [ ] 결과 테이블/리스트
- [ ] 로딩 / 에러 상태

---

## 7. 주의사항

- **요청 간 딜레이**: 서버 부하를 줄이기 위해 요청 사이에 1~3초 간격을 둔다
- **User-Agent 설정**: 크롤러임을 숨기기보다 명확하게 표시하는 것이 권장됨
- **동시 요청 제한**: 기본값 3개 이하로 유지
- **에러 핸들링**: 타임아웃, 404, 네트워크 오류 각각 처리
- **개인정보 주의**: 수집 데이터에 개인정보가 포함되지 않도록 유의
