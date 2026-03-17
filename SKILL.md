---
name: geeknews-notion-upload
description: 매일 오전 10시 15분에 news-crawl-result.json을 읽고 카드뉴스 텍스트 생성 후 Notion DB 업로드
---

## 작업 개요

`/sessions/dazzling-determined-cray/mnt/webcrawl/news-crawl-result.json` 파일을 읽고, 각 뉴스 아이템에 대해 아래 워크플로우를 수행한 뒤 Notion Database에 업로드한다.

**Notion Database URL**: https://www.notion.so/choiyoungjune/32421bc2456c8033986aebb3d9df5993?v=32421bc2456c80afa971000cab50a5c3
**Notion Database ID**: `32421bc2456c8033986aebb3d9df5993`

---

## 실행 순서

### STEP 0 — JSON 파일 읽기
- Bash 도구로 `/sessions/dazzling-determined-cray/mnt/webcrawl/news-crawl-result.json` 읽기
- JSON 배열의 각 아이템을 순회하며 아래 STEP 1~5를 반복 수행
- 아이템의 소스는 Geeknews 외에도 다양한 채널(블로그, 미디엄, 유튜브, 공식 문서 등)이 포함될 수 있으므로, 소스 종류에 상관없이 모든 아이템을 동일하게 처리한다

---

### STEP 1 — 원문 링크 접속 및 본문 읽기
- 각 아이템에 포함된 소스 링크(원문 URL)에 접속하여 전체 본문 내용 읽기
- 아이템에 Geeknews 링크(`https://news.hada.io/topic?id=XXXXX`)가 있는 경우 함께 저장
- Geeknews 링크가 없는 소스(블로그, 미디엄, 공식 문서 등)는 원문 링크만 저장
- 원문 접근이 불가한 경우 아이템의 제목·요약 등 JSON에 포함된 데이터를 최대한 활용

---

### STEP 2 — 색상 조합 추천
- WebSearch로 "Adobe Color Trends 2026" 검색하여 최신 트렌드 파악
- 아티클의 주제·분위기에 맞는 대비가 명확한 2가지 색상 조합 추천
- 각 조합은 배경색(Background) + 텍스트색(Text) 한 쌍으로 구성

출력 형식:
```
🎨 색상 추천
Option A — [조합 이름]
  Background : #XXXXXX
  Text       : #XXXXXX
  분위기     : (한 줄 설명)

Option B — [조합 이름]
  Background : #XXXXXX
  Text       : #XXXXXX
  분위기     : (한 줄 설명)
```

---

### STEP 3 — 카드뉴스 텍스트 구조화 (총 10장)

아래 규칙에 따라 표지 1장 + 내지 9장 작성

#### 🃏 표지 (Card 1) 규칙
- **분야**: 아래 기준에 따라 하나 선택
  - **Frontend** — HTML/CSS/JS, React/Vue/Svelte 등 브라우저·UI 기술, 웹 퍼포먼스, 접근성
  - **Backend** — 서버, API 설계, 데이터베이스, 언어 런타임(Go/Rust/Java 등), 시스템 프로그래밍
  - **AI/ML** — LLM, 머신러닝, 딥러닝, AI 에이전트, 모델 아키텍처, AI 도구 활용
  - **DevOps** — CI/CD, 컨테이너(Docker/K8s), 클라우드, 모니터링, 서버 운영
  - **Career** — 채용, 커리어 성장, 면접, 연봉 협상, 개발자 커리어 패스
  - **Work** — 일하는 방식, 생산성, 팀 협업, 개발 문화, 리모트워크
  - **CS** — 알고리즘, 자료구조, 운영체제, 네트워크, 컴퓨터 과학 기초
  - **Tool** — 오픈소스 프로젝트 릴리즈, 개발 도구, 라이브러리 소개
- **타이틀**: 한 줄 최대 13자(띄어쓰기 포함) / 최대 2줄 / 전체 최대 26자. 짧을수록 좋음. 클릭 유도 문장
- **서브타이틀**: 최대 24자. 링크 내용을 한 줄로 압축

#### 🃏 내지 (Card 2~10) 규칙
- **타이틀**: 해당 파트를 대표하는 간결한 키워드형 제목
- **내용 작성 규칙**:
  1. 핵심 키워드·수치·강조 표현은 **볼드** 처리 (e.g. `**Host 시스템**이 통째로 노출되는데`)
  2. 줄바꿈 없이 이어서 작성
  3. 문장 끝에 마침표(.) 사용
  4. 쉼표(,) 사용 금지
  5. 친숙한 말투: ~했어 / ~이뤄져 / ~라고 해 / ~야 / ~거든 / ~되는데 (formal 말투 금지)
  6. 각 카드는 이전 카드를 자연스럽게 이어받는 브릿지 문장으로 시작 (e.g. "그 분리 구조가 생각보다 단순한데", "그럼 실제로 어떻게 동작하냐면")

#### 출력 템플릿
```
🃏 표지 (Card 1)
분야       Frontend / Backend / AI/ML / DevOps / Career / Work / CS / Tool
타이틀     (한 줄 최대 13자 / 최대 2줄 / 전체 최대 26자)
서브타이틀  (최대 24자)

🃏 Card 2
타이틀  (간결한 키워드형 제목)
내용    (브릿지 문장으로 시작, 볼드 포함)

🃏 Card 3
타이틀  ...
내용    (이전 카드 이어받는 브릿지 문장으로 시작)

... Card 10까지 동일하게 반복
```

---

### STEP 4 — SNS 본문 생성

카드뉴스(Card 1~10)를 기반으로 인스타그램/스레드용 SNS 본문을 작성한다.

#### 작성 규칙
- Card 2~10의 **내용(본문 텍스트)**만 사용 (각 카드의 타이틀은 제외)
- 각 카드 내용은 빈 줄 하나로 구분
- 볼드(**텍스트**) 마크다운은 그대로 유지
- 링크: Geeknews 링크가 있는 경우 Geeknews 링크 사용 / 없으면 원문 링크 사용
- 타이틀의 줄바꿈(\n)은 제거하고 한 줄로 이어서 작성

#### 출력 형식
```
#부리부리데브왕_[분야]

[타이틀 — 줄바꿈 없이 한 줄로]
- [서브타이틀]

[Card 2 내용]

[Card 3 내용]

[Card 4 내용]

[Card 5 내용]

[Card 6 내용]

[Card 7 내용]

[Card 8 내용]

[Card 9 내용]

[Card 10 내용]

🔗 원문: [Geeknews 링크 또는 원문 링크]

#개발 #개발자 #[분야]
```

---

### STEP 5 — Notion Database 업로드

`notion-create-pages` 도구를 사용하여 각 아이템을 Notion DB에 페이지로 생성한다.

업로드 내용:
- **제목(Name)**: 아티클 원문 제목
- **소스 URL**: 원문 링크 (소스 종류와 무관하게 항상 포함)
- **Geeknews URL**: Geeknews 링크가 있는 경우에만 포함 (`https://news.hada.io/topic?id=XXXXX`)
- **분야**: Frontend / Backend / AI/ML / DevOps / Career / Work / CS / Tool
- **카드뉴스 내용**: Card 1~10 전체 텍스트 (페이지 본문에 삽입)
- **색상 추천**: Option A, B 색상 조합 (페이지 본문에 삽입)
- **SNS 본문**: STEP 4에서 생성한 SNS 본문을 페이지 본문 **맨 마지막**에 아래와 같이 삽입

페이지 본문 구성 순서:
```
## 🔗 링크
...

## 🎨 색상 추천
...

## 🃏 카드뉴스 (10장)
...

---

## 📱 SNS 본문
[STEP 4에서 생성한 SNS 본문 전체]
```

---

### STEP 6 — 완료 보고
모든 아이템 처리 완료 후 요약 보고:
- 처리된 아이템 수 및 소스 채널 목록
- Notion 업로드 성공/실패 여부
- 실패한 아이템이 있으면 오류 내용 출력
