// Підмножина API Cloudflare D1 (prepare → bind → first/all/run) поверх node:sqlite — для тестів Worker'а.
// SQL той самий (SQLite), але це не справжній D1: межі й помилки D1 тут не відтворюються.
import { DatabaseSync } from 'node:sqlite';

export function createFakeD1(schemaSql = '') {
  const db = new DatabaseSync(':memory:');
  if (schemaSql) db.exec(schemaSql);
  const statement = (sql, args = []) => ({
    bind: (...a) => statement(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
  });
  return { prepare: (sql) => statement(sql) };
}
