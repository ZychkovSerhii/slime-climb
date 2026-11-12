import { expect, test } from 'vitest';
import { createFakeD1 } from './helpers/fakeD1.js';

test('fakeD1: prepare/bind/first/all/run', async () => {
  const db = createFakeD1('CREATE TABLE t (a INT);');
  const r = await db.prepare('INSERT INTO t (a) VALUES (?)').bind(5).run();
  expect(r.meta.changes).toBe(1);
  expect(await db.prepare('SELECT a FROM t').first()).toEqual({ a: 5 });
  expect((await db.prepare('SELECT a FROM t WHERE a = ?').bind(5).all()).results).toHaveLength(1);
  expect(await db.prepare('SELECT a FROM t WHERE a = ?').bind(7).first()).toBeNull();
});
