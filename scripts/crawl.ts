// 크롤링 실행 스크립트
// 실행: yarn crawl

import fs from 'fs';
import path from 'path';
import { crawlCollectio } from '../src/lib/crawler/sites/collectio';

(async () => {
  console.log('크롤링 시작: collectio.co.kr\n');

  const start = Date.now();
  const { movies, errors } = await crawlCollectio();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // ── 섹션별 요약 출력 ──
  const bySection = movies.reduce<Record<string, typeof movies>>((acc, m) => {
    (acc[m.section] ??= []).push(m);
    return acc;
  }, {});

  for (const [section, items] of Object.entries(bySection)) {
    console.log(`${section}  (${items.length}개)`);
    for (const m of items) {
      console.log(`  · ${m.title} | ${m.director} | ${m.year} | ${m.runtime} | ${m.rating}세`);
    }
    console.log('');
  }

  // ── JSON 파일 저장 ──
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `collectio_${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({ crawledAt: new Date().toISOString(), count: movies.length, movies }, null, 2), 'utf-8');

  // ── 결과 요약 ──
  console.log('-'.repeat(50));
  console.log(`수집 완료   ${movies.length}개`);
  console.log(`오류        ${errors.length}개`);
  console.log(`소요 시간   ${elapsed}s`);
  console.log(`저장 경로   ${outputPath}`);

  if (errors.length > 0) {
    console.log('\n[오류 목록]');
    console.log(JSON.stringify(errors, null, 2));
  }
})();
