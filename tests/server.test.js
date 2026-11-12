import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { handle } from '../server/src/index.js';
import { maxHeightPoints } from '../src/systems/LeaderboardRules.js';
import { createFakeD1 } from './helpers/fakeD1.js';

const schema = readFileSync(join(import.meta.dirname, '..', 'server', 'schema.sql'), 'utf8');
const BASE = 'https://lb.example';
const ID = (n) => n.toString(16).padStart(16, '0');

let env;
let now;
beforeEach(() => {
  env = { DB: createFakeD1(schema) };
  now = 1_000_000;
});

const call = async (method, path, body, headers = {}) => {
  const init = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await handle(new Request(BASE + path, init), env, now);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
};
const score = (id, height, nick = 'Гравець', timeSec = 300) => call('POST', '/score', { id: ID(id), nick, height, timeSec });
const top = (id) => call('GET', `/top?id=${ID(id)}`);

describe('POST /score', () => {
  test('рейтинг між гравцями', async () => {
    expect(await score(1, 100)).toMatchObject({ status: 200, body: { rank: 1, best: 100 } });
    now += 1;
    expect((await score(2, 150)).body).toEqual({ rank: 1, best: 150 });
    expect((await top(1)).body.me).toEqual({ rank: 2, height: 100 });
  });

  test('гірший результат не знижує найкращий', async () => {
    await score(1, 100);
    now += 21_000;
    expect((await score(1, 80)).body).toEqual({ rank: 1, best: 100 });
    expect((await top(1)).body.top).toEqual([{ nick: 'Гравець', height: 100 }]);
    now += 21_000;
    expect((await score(1, 130)).body.best).toBe(130);
  });

  test('ліміт частоти — 20 с', async () => {
    await score(1, 100);
    now += 5_000;
    expect((await score(1, 120)).status).toBe(429);
    now += 15_000;
    expect((await score(1, 120)).status).toBe(200);
  });

  test('погані дані', async () => {
    expect((await score(1, 100, 'хуй')).status).toBe(422);
    expect((await score(1, maxHeightPoints(300) + 10)).status).toBe(422);
    expect((await call('POST', '/score', { id: 'abc', nick: 'Гравець', height: 1, timeSec: 10 })).status).toBe(400);
    expect((await call('POST', '/score', 'not json')).status).toBe(400);
    expect((await call('POST', '/score', [1, 2])).status).toBe(400);
  });
});

describe('POST /nick', () => {
  test('змінює нік; новий гравець без висоти не в топі', async () => {
    await score(1, 100, 'Старий');
    now += 21_000;
    expect(await call('POST', '/nick', { id: ID(1), nick: 'Новий' })).toMatchObject({ status: 200, body: { ok: true } });
    expect((await top(1)).body.top[0].nick).toBe('Новий');
    expect((await call('POST', '/nick', { id: ID(2), nick: 'Хтось' })).status).toBe(200);
    const t = await top(2);
    expect(t.body.top).toHaveLength(1);
    expect(t.body.me).toBeNull();
  });
  test('мат і ліміт', async () => {
    expect((await call('POST', '/nick', { id: ID(1), nick: 'сука' })).status).toBe(422);
    expect((await call('POST', '/nick', { id: ID(1), nick: 'Норм' })).status).toBe(200);
    expect((await call('POST', '/nick', { id: ID(1), nick: 'Норм2' })).status).toBe(429);
  });
  test('щойно збережений нік не блокує результат і навпаки', async () => {
    expect((await call('POST', '/nick', { id: ID(1), nick: 'Сашко' })).status).toBe(200);
    now += 1_000;
    expect((await score(1, 100, 'Сашко')).status).toBe(200);
    now += 1_000;
    expect((await call('POST', '/nick', { id: ID(1), nick: 'Сашко2' })).status).toBe(429);
    now += 19_000;
    expect((await call('POST', '/nick', { id: ID(1), nick: 'Сашко2' })).status).toBe(200);
    expect((await top(1)).body.top[0].nick).toBe('Сашко2');
  });
});

describe('GET /top', () => {
  test('50 рядків, спадання, рівні — раніший вище', async () => {
    for (let i = 1; i <= 60; i++) {
      now += 1;
      await score(i, 10 * i);
    }
    now += 1;
    await score(100, 600, 'Пізній'); // така сама висота, як у гравця 60, але пізніше
    const t = await top(1);
    expect(t.body.top).toHaveLength(50);
    expect(t.body.top[0]).toEqual({ nick: 'Гравець', height: 600 });
    expect(t.body.top[1]).toEqual({ nick: 'Пізній', height: 600 });
    expect(t.body.top[2].height).toBe(590);
    expect(t.body.me).toEqual({ rank: 61, height: 10 });
    expect((await top(100)).body.me).toEqual({ rank: 2, height: 600 });
  });
  test('без id — me null', async () => {
    expect((await call('GET', '/top')).body).toEqual({ top: [], me: null });
  });
});

describe('CORS і маршрути', () => {
  test('Capacitor і localhost дозволені, чужі — ні', async () => {
    const ok = await call('OPTIONS', '/score', undefined, { Origin: 'https://localhost' });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://localhost');
    const dev = await call('GET', '/top', undefined, { Origin: 'http://localhost:5173' });
    expect(dev.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    const evil = await call('OPTIONS', '/score', undefined, { Origin: 'https://evil.example' });
    expect(evil.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
  test('404', async () => {
    expect((await call('GET', '/nope')).status).toBe(404);
  });
});
