import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  // networkidle 대신 domcontentloaded + 추가 대기로 변경
  await page.goto('https://yozm.wishket.com/magazine/list/new/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const html = await page.content();
  console.log('HTML 길이:', html.length);
  
  const dateMatches = html.match(/\d{4}[-\.]\d{2}[-\.]\d{2}/g);
  console.log('날짜 패턴:', dateMatches ? [...new Set(dateMatches)].slice(0, 10) : '없음');
  
  const links = html.match(/magazine\/detail\/\d+/g);
  console.log('아티클 링크:', links ? [...new Set(links)].slice(0, 10) : '없음');
  
  const datetimes = html.match(/datetime="[^"]+"/g);
  console.log('datetime 속성:', datetimes ? datetimes.slice(0, 5) : '없음');
  
  const dateIdx = html.search(/\d{4}[-\.]\d{2}[-\.]\d{2}/);
  if (dateIdx >= 0) {
    console.log('날짜 컨텍스트:', html.slice(Math.max(0, dateIdx-100), dateIdx+100));
  }
  
  await browser.close();
}
main().catch(console.error);
