import * as cheerio from 'cheerio';
import type { JobPosting } from '@/entities/job-posting';

/** 사이트별 크롤링 설정 타입 */
export interface SiteConfig {
  /** 출처 사이트 표시명 */
  name: string;
  /** 크롤링 대상 URL */
  url: string;
  /** static: fetch 기반 / dynamic: playwright 기반 / api: JSON REST API 직접 호출 */
  mode: 'static' | 'dynamic' | 'api';
  /** Playwright page.goto waitUntil 옵션 (기본값: 'domcontentloaded') */
  waitUntil?: 'domcontentloaded' | 'load' | 'commit';
  /**
   * 무한 스크롤 설정. 설정 시 crawlSite에서 스크롤을 반복하며 컨텐츠를 추가 로드한다.
   * - maxScrolls: 최대 스크롤 횟수 (높이 변화 없으면 조기 종료)
   * - waitMs: 스크롤 후 컨텐츠 로드 대기 시간(ms)
   */
  scrollOptions?: { maxScrolls: number; waitMs: number };
  /**
   * 페이지네이션 설정. 설정 시 crawlSite에서 pageParam을 순차 증가시키며 순차 로드한다.
   * - pageParam: URL 쿼리 파라미터명 (e.g. 'pageNumber', 'offset')
   * - maxPages: 최대 페이지 수 (실제 데이터 없으면 조기 종료)
   * - waitMs: 페이지 이동 후 렌더링 대기 시간(ms), 기본값 3000
   * - startValue: 첫 번째 페이지 파라미터 값 (기본값 1). offset 기반 API는 0으로 설정
   * - step: 페이지마다 파라미터 증가량 (기본값 1). offset 기반 API는 pageSize로 설정
   */
  pagination?: { pageParam: string; maxPages: number; waitMs?: number; startValue?: number; step?: number };
  /** HTML에서 JobPosting 목록을 추출하는 사이트별 파서 */
  mapper: (html: string) => JobPosting[];
}

// ─── 사이트별 파서 ────────────────────────────────────────────────────────────
// NOTE: 각 사이트의 HTML 구조 변경 시 셀렉터를 수정해야 한다.

function parseWanted(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  // 실제 HTML 분석 기반 셀렉터 (2025-03 확인)
  $('li a[href*="/wd/"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('[class*="body__position"]').text().trim();
    const company = $el.find('[class*="__company__"]').text().trim();
    const locationRaw = $el.find('[class*="__location__"]').text().trim();
    // "서울 강남구 · 경력 2년 이상" → 위치와 경력 분리
    const [location, career] = locationRaw.split(' · ');
    const href = $el.attr('href') ?? '';
    const url = `https://www.wanted.co.kr${href}`;

    if (title && company) jobs.push({ title, company, location: location?.trim(), career: career?.trim(), url, source: '원티드' });
  });

  return jobs;
}

function parseSaramin(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('.item_recruit').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.job_tit a').text().trim();
    const company = $el.find('.corp_name a').text().trim();
    const location = $el.find('.work_place').text().trim();
    const career = $el.find('.career').text().trim();
    const href = $el.find('.job_tit a').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://www.saramin.co.kr${href}`;

    if (title && company) jobs.push({ title, company, location, career, url, source: '사람인' });
  });

  return jobs;
}

function parseJobKorea(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('.list-post .post-list-corp').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.post-list-info .title').text().trim();
    const company = $el.find('.post-list-corp-info .name').text().trim();
    const location = $el.find('.post-list-info .loc').text().trim();
    const career = $el.find('.post-list-info .exp').text().trim();
    const href = $el.find('a.title').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://www.jobkorea.co.kr${href}`;

    if (title && company) jobs.push({ title, company, location, career, url, source: '잡코리아' });
  });

  return jobs;
}

function parseJumpit(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  // 공고 카드: a[href^="/position/{id}"]
  // 회사명은 썸네일 img의 alt, 공고명은 a의 title 속성
  // 마지막 ul의 li: [위치, 경력]
  $('a[href^="/position/"]').each((_, el) => {
    const $el = $(el);
    const title = $el.attr('title') ?? '';
    const company = $el.find('img.img').attr('alt')?.trim() ?? '';
    const infoItems = $el
      .find('ul')
      .last()
      .find('li')
      .map((__, li) => $(li).text().trim())
      .get();
    const location = infoItems[0] ?? '';
    const career = infoItems[1] ?? '';
    const href = $el.attr('href') ?? '';
    const url = `https://jumpit.saramin.co.kr${href}`;

    if (title && company) jobs.push({ title, company, location, career, url, source: '점핏' });
  });

  return jobs;
}

function parseRallit(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('a[href*="/positions/"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('h3[class*="title"]').text().trim();
    const company = $el.find('p[class*="company-name"]').text().trim();
    const href = $el.attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://www.rallit.com${href}`;

    // career + location: Mantine Divider(role="separator") 기준으로 추출
    // 구조: <span> <p>경력</p> <div role="separator"/> 위치텍스트 <p/> </span>
    let career = '';
    let location = '';
    const $sep = $el.find('[role="separator"]');
    if ($sep.length) {
      const $span = $sep.parent();
      career = $span
        .find('p')
        .filter((_, e) => $(e).text().trim() !== '')
        .first()
        .text()
        .trim();
      location = $span
        .contents()
        .filter((_, node) => node.type === 'text' && $(node).text().trim() !== '')
        .text()
        .trim();
    }

    if (title && company) jobs.push({ title, company, career, location, url, source: '랠릿' });
  });

  return jobs;
}

function parseGroupby(json: string): JobPosting[] {
  const data = JSON.parse(json) as {
    data: {
      items: {
        id: number;
        name: string;
        careerType: string;
        startup: { name: string; location: string };
        location: { name: string } | null;
      }[];
    };
  };

  return data.data.items.map((item) => ({
    title: item.name,
    company: item.startup.name,
    location: item.startup.location ?? item.location?.name ?? '',
    career: item.careerType,
    url: `https://groupby.kr/positions/${item.id}`,
    source: '그룹바이',
  }));
}

function parseJobplanet(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('.recruit-list-item').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.job-title').text().trim();
    const company = $el.find('.company-name').text().trim();
    const location = $el.find('.location').text().trim();
    const career = $el.find('.career').text().trim();
    const href = $el.find('a').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://www.jobplanet.co.kr${href}`;

    if (title && company) jobs.push({ title, company, location, career, url, source: '잡플래닛' });
  });

  return jobs;
}

function parseOkky(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('[class*="JobCard"], .job-card').each((_, el) => {
    const $el = $(el);
    const title = $el.find('[class*="title"]').first().text().trim();
    const company = $el.find('[class*="company"]').first().text().trim();
    const location = $el.find('[class*="location"]').text().trim();
    const career = $el.find('[class*="career"]').text().trim();
    const href = $el.find('a').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://jobs.okky.kr${href}`;

    if (title && company) jobs.push({ title, company, location, career, url, source: 'OKKY' });
  });

  return jobs;
}

function parseCareerly(json: string): JobPosting[] {
  const data = JSON.parse(json) as {
    results: {
      id: number;
      title: string;
      companyName: string;
      employmentType: string;
      location: string | null;
    }[];
  };

  return data.results.map((item) => ({
    title: item.title,
    company: item.companyName,
    career: item.employmentType || undefined,
    location: item.location ?? undefined,
    url: `https://www.careerly.co.kr/jobs/${item.id}`,
    source: '커리어리',
  }));
}

function parseSurfit(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('[class*="JobCard"], [class*="job-item"], article').each((_, el) => {
    const $el = $(el);
    const title = $el.find('[class*="title"]').first().text().trim();
    const company = $el.find('[class*="company"]').first().text().trim();
    const location = $el.find('[class*="location"]').text().trim();
    const href = $el.find('a').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://jobs.surfit.io${href}`;

    if (title && company) jobs.push({ title, company, location, url, source: '서핏' });
  });

  return jobs;
}

// ─── 사이트 목록 ──────────────────────────────────────────────────────────────

export const SITES: SiteConfig[] = [
  {
    name: '원티드',
    url: 'https://www.wanted.co.kr/wdlist/518/669?country=kr&job_sort=job.latest_order&years=0&locations=all',
    mode: 'dynamic',
    // 무한 스크롤 사이트 — 스크롤당 약 20건씩 추가 로드
    scrollOptions: { maxScrolls: 10, waitMs: 2000 },
    mapper: parseWanted,
  },
  {
    name: '점핏',
    url: 'https://jumpit.saramin.co.kr/positions?jobCategory=2&career=0&sort=popular',
    mode: 'dynamic',
    scrollOptions: { maxScrolls: 10, waitMs: 2000 },
    mapper: parseJumpit,
  },
  {
    name: '랠릿',
    url: 'https://www.rallit.com/?job=FRONTEND_DEVELOPER&jobGroup=DEVELOPER&jobLevel=IRRELEVANT,INTERN,BEGINNER&pageNumber=1',
    mode: 'dynamic',
    pagination: { pageParam: 'pageNumber', maxPages: 20 },
    mapper: parseRallit,
  },
  {
    name: '그룹바이',
    url: 'https://api.groupby.kr/startup-positions?careerTypes=1&isAdvertising=false&positionTypes=1&limit=10&orderBy=-updatedAt',
    mode: 'api',
    // offset 기반 페이지네이션: offset=0, 10, 20...
    pagination: { pageParam: 'offset', maxPages: 10, startValue: 0, step: 10 },
    mapper: parseGroupby,
  },
  // {
  //   name: '커리어리',
  //   // requirements 파라미터는 텍스트 검색으로 결과가 거의 없어 title 검색만 사용
  //   url: 'https://v2.careerly.co.kr/api/v1/jobs/search/?title=%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C',
  //   mode: 'api',
  //   pagination: { pageParam: 'page', maxPages: 10 },
  //   mapper: parseCareerly,
  // },
  // {
  //   name: '사람인',
  //   url: 'https://www.saramin.co.kr/zf_user/jobs/list/job-category?cat_kewd=87%2C88&panel_type=&search_optional_item=n&search_done=y&panel_count=y&preview=y',
  //   mode: 'dynamic',
  //   // commit: 응답 시작 즉시 진행 — 사람인은 백그라운드 요청이 많아 domcontentloaded에서 타임아웃 발생
  //   waitUntil: 'commit',
  //   mapper: parseSaramin,
  // },
  // {
  //   name: '잡코리아',
  //   url: 'https://www.jobkorea.co.kr/recruit/joblist?menucode=duty',
  //   mode: 'dynamic',
  //   mapper: parseJobKorea,
  // },
  // {
  //   name: '잡플래닛',
  //   url: 'https://www.jobplanet.co.kr/job',
  //   mode: 'dynamic',
  //   mapper: parseJobplanet,
  // },
  // {
  //   name: '서핏',
  //   url: 'https://jobs.surfit.io/develop/front-end',
  //   mode: 'dynamic',
  //   mapper: parseSurfit,
  // },
  // {
  //   name: 'OKKY',
  //   url: 'https://jobs.okky.kr/contract?duty%5B0%5D=40&duty%5B1%5D=36&minCareer=0',
  //   mode: 'dynamic',
  //   scrollOptions: { maxScrolls: 10, waitMs: 2000 },
  //   mapper: parseOkky,
  // },
];
