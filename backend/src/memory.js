import db from './db.js';

export const ensureSession = (sessionId) => {
  db.prepare('INSERT OR IGNORE INTO sessions (id, created_at) VALUES (?, ?)')
    .run(sessionId, Date.now());
};

export const saveMessage = (sessionId, role, content) => {
  ensureSession(sessionId);
  db.prepare(
    'INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, role, content, Date.now());
};

export const getRecentMessages = (sessionId, limit) => {
  return db.prepare(
    'SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(sessionId, limit).reverse();
};

export const getMessageCount = (sessionId) => {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE session_id = ?'
  ).get(sessionId);
  return row?.count ?? 0;
};

export const getSummary = (sessionId) => {
  const row = db.prepare(
    'SELECT summary FROM memory_summaries WHERE session_id = ?'
  ).get(sessionId);
  return row?.summary ?? '';
};

export const upsertSummary = (sessionId, summary) => {
  ensureSession(sessionId);
  db.prepare(
    `INSERT INTO memory_summaries (session_id, summary, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(session_id)
     DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at`
  ).run(sessionId, summary, Date.now());
};
