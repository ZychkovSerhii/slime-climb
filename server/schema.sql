-- Таблиця лідерів (етап 12). Один рядок на пристрій — найкращий результат.
-- Застосовується повторно без шкоди (IF NOT EXISTS). Стерти все перед релізом: DELETE FROM scores;
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  nick TEXT NOT NULL,
  height INTEGER NOT NULL DEFAULT 0,
  time_sec INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  last_submit_at INTEGER NOT NULL,
  nick_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS scores_height ON scores (height DESC, updated_at ASC);
