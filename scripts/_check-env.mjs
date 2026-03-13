import 'dotenv/config';

const id = process.env.NOTION_DATABASE_ID ?? '';
const key = process.env.NOTION_API_KEY ?? '';

console.log('DATABASE_ID length:', id.length);
console.log('DATABASE_ID hasDash:', id.includes('-'));
console.log('API_KEY exists:', key.length > 0);

// Notion DB ID는 32자 hex (대시 없음) 또는 36자 UUID (대시 있음) 형식
if (id.length !== 32 && id.length !== 36) {
  console.warn('WARNING: DATABASE_ID 길이가 비정상입니다. 32자(hex) 또는 36자(UUID) 이어야 합니다.');
}
