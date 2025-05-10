import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export const sqlite = new Database('./database/erp.db', {
  timeout: 5000, // 5초 대기
});
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = -64000'); // 약 64MB
sqlite.pragma('temp_store = MEMORY');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite); 