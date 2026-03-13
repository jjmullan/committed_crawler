import * as cheerio from 'cheerio';
import type { JobPosting } from '@/entities/job-posting';

/** 사이트별 크롤링 설정 타입 */
export interface SiteConfig {
  /** 출처 사이트 표시명 */
  name: string;
  /** 크롤링 대상 URL */
  url: string;
  /** static: fetch 기반 / dynamic: playwright 기반 */
  mode: 'static' | 'dynamic';
  /** Playwright page.goto waitUntil 옵션 (기본값: 'domcontentloaded') */
  waitUntil?: 'domcontentloaded' | 'load' | 'commit';
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

  $('[class*="PositionCard"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('[class*="position"]').first().text().trim();
    const company = $el.find('[class*="company"]').first().text().trim();
    const location = $el.find('[class*="location"]').text().trim();
    const href = $el.find('a').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://jumpit.saramin.co.kr${href}`;

    if (title && company) jobs.push({ title, company, location, url, source: '점핏' });
  });

  return jobs;
}

function parseRallit(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  // 실제 HTML 분석 기반 셀렉터 (2025-03 확인)
  $('a[href*="/positions/"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('h3[class*="title"]').text().trim();
    const company = $el.find('p[class*="company-name"]').text().trim();
    const href = $el.attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://www.rallit.com${href}`;

    if (title && company) jobs.push({ title, company, url, source: '랠릿' });
  });

  return jobs;
}

function parseGroupby(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('[class*="PositionItem"], [class*="position-item"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('[class*="title"]').first().text().trim();
    const company = $el.find('[class*="company"]').first().text().trim();
    const location = $el.find('[class*="location"]').text().trim();
    const href = $el.find('a').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://groupby.kr${href}`;

    if (title && company) jobs.push({ title, company, location, url, source: '그룹바이' });
  });

  return jobs;
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

function parseCareerly(html: string): JobPosting[] {
  const $ = cheerio.load(html);
  const jobs: JobPosting[] = [];

  $('[class*="JobCard"], [class*="job-card"]').each((_, el) => {
    const $el = $(el);
    const title = $el.find('[class*="title"]').first().text().trim();
    const company = $el.find('[class*="company"]').first().text().trim();
    const location = $el.find('[class*="location"]').text().trim();
    const href = $el.find('a').attr('href') ?? '';
    const url = href.startsWith('http') ? href : `https://www.careerly.co.kr${href}`;

    if (title && company) jobs.push({ title, company, location, url, source: '커리어리' });
  });

  return jobs;
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
    url: 'https://www.wanted.co.kr/wdlist/518/669?country=kr&job_sort=job.latest_order&years=0&years=2&locations=all',
    mode: 'dynamic',
    mapper: parseWanted,
  },
  {
    name: '사람인',
    url: 'https://www.saramin.co.kr/zf_user/jobs/list/job-category?cat_kewd=87%2C88&panel_type=&search_optional_item=n&search_done=y&panel_count=y&preview=y',
    mode: 'dynamic',
    // commit: 응답 시작 즉시 진행 — 사람인은 백그라운드 요청이 많아 domcontentloaded에서 타임아웃 발생
    waitUntil: 'commit',
    mapper: parseSaramin,
  },
  {
    name: '잡코리아',
    url: 'https://www.jobkorea.co.kr/recruit/joblist?menucode=duty',
    mode: 'dynamic',
    mapper: parseJobKorea,
  },
  {
    name: '점핏',
    url: 'https://jumpit.saramin.co.kr/positions?jobCategory=2&career=0&sort=popular',
    mode: 'dynamic',
    mapper: parseJumpit,
  },
  {
    name: '랠릿',
    url: 'https://www.rallit.com/?job=FRONTEND_DEVELOPER&jobGroup=DEVELOPER&pageNumber=1',
    mode: 'dynamic',
    mapper: parseRallit,
  },
  {
    name: '그룹바이',
    url: 'https://groupby.kr/positions?careerTypes=1&positionTypes=1',
    mode: 'dynamic',
    mapper: parseGroupby,
  },
  {
    name: '잡플래닛',
    url: 'https://www.jobplanet.co.kr/job',
    mode: 'dynamic',
    mapper: parseJobplanet,
  },
  {
    name: 'OKKY',
    url: 'https://jobs.okky.kr/contract?duty%5B0%5D=40&duty%5B1%5D=36&minCareer=0',
    mode: 'dynamic',
    mapper: parseOkky,
  },
  {
    name: '커리어리',
    url: 'https://www.careerly.co.kr/job?title=%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C',
    mode: 'dynamic',
    mapper: parseCareerly,
  },
  {
    name: '서핏',
    url: 'https://jobs.surfit.io/develop/front-end',
    mode: 'dynamic',
    mapper: parseSurfit,
  },
];
