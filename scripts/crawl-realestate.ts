/**
 * 네이버 부동산 배치 크롤러 실행 스크립트
 * 실행: yarn crawl-realestate
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { runRealEstateCrawlBatch, TARGET_REGIONS } from '../src/features/crawl-realestate';
import { saveRealEstateToSheets } from '../src/features/crawl-export';

(async () => {
  console.log(`크롤링 시작: 총 ${TARGET_REGIONS.length}개 지역`);

  const batch = await runRealEstateCrawlBatch(TARGET_REGIONS, async (result, index) => {
    console.log(`\n[${index + 1}] ${result.region} — 단지 ${result.totalComplexes}개 / 매물 ${result.totalArticles}건`);

    if (result.error) {
      console.error(`  에러: ${result.error}`);
      return;
    }

    try {
      const { added, updated } = await saveRealEstateToSheets(result.articles, result.crawledAt);
      console.log(`  시트 저장: 신규 ${added}건 / 갱신 ${updated}건`);
    } catch (e) {
      console.warn(`  시트 저장 실패:`, (e as Error).message);
    }
  });

  console.log('\n=== 전체 결과 ===');
  console.log('지역 수:', batch.results.length);
  console.log('총 단지 수:', batch.totalComplexes);
  console.log('총 매물 수:', batch.totalArticles);

  // console.log('\n=== 첫 5개 매물 (첫 번째 지역) ===');
  // batch.results[0]?.articles.slice(0, 5).forEach((a, i) => {
  //   console.log(`\n[${i + 1}] ${a.complexName} (${a.city} ${a.division})`);
  //   console.log(`  세대수: ${a.totalHouseholdNumber}세대 | 사용승인: ${a.useApprovalDate}`);
  //   console.log(`  용적률: ${a.floorAreaRatio}% | 건폐율: ${a.buildingCoverageRatio}%`);
  //   console.log(`  동: ${a.dongName} | ${a.floor}층/${a.totalFloor}층 | ${a.direction}`);
  //   console.log(`  공급: ${a.supplySpace}㎡ | 전용: ${a.exclusiveSpace}㎡`);
  //   console.log(`  매물가: ${(a.dealPrice / 100_000_000).toFixed(2)}억`);
  // });
})();
