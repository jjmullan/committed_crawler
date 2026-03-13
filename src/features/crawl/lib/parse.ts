import * as cheerio from 'cheerio';
import type { CrawlConfig, ParsedItem } from '@/entities/crawl-item';

/**
 * raw HTML 문자열을 cheerio로 파싱하여 셀렉터에 매칭되는 요소를 추출한다.
 * config.maxItems가 설정된 경우 해당 개수만큼만 반환한다.
 */
export function parseHtml(html: string, config: CrawlConfig): ParsedItem[] {
  const $ = cheerio.load(html);
  const items: ParsedItem[] = [];

  $(config.selector).each((index, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    // 텍스트가 없는 요소는 수집 의미가 없으므로 제외
    if (!text) return;

    items.push({
      index,
      text,
      href: $el.attr('href'),
    });
  });

  return config.maxItems ? items.slice(0, config.maxItems) : items;
}
