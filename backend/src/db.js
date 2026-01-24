import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import config from './config.js';

const dataDir = path.dirname(config.memory.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(config.memory.dbPath);
const schemaPath = new URL('../sql/schema.sql', import.meta.url);
const schema = fs.readFileSync(schemaPath, 'utf-8');

db.exec(schema);

db.pragma('journal_mode = WAL');

db.prepare(
  'INSERT OR IGNORE INTO sessions (id, created_at) VALUES (?, ?)' 
).run('bootstrap', Date.now());

export default db;
