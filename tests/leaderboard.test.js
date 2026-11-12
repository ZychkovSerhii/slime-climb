import { describe, expect, test, vi } from 'vitest';
import {
  enqueueResult, fetchTop, flush, loadNick, pendingResult, playerId, saveNick, sendNick, statusLine,
} from '../src/systems/Leaderboard.js';
import { maxHeightPoints } from '../src/systems/LeaderboardRules.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const brokenStorage = () => ({
  getItem: () => { throw new Error('no'); },
  setItem: () => { throw new Error('no'); },
  removeItem: () => { throw new Error('no'); },
});
const reply = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => (typeof body === 'string' ? JSON.parse(body) : body) });
const URL = 'https://lb.example';
const opts = (fetchFn, timeoutMs = 50) => ({ url: URL, fetchFn, timeoutMs });

describe('ID і нік', () => {
  test('ID стабільний, 16 hex', () => {
    const s = memStorage();
    const id = playerId(s);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(playerId(s)).toBe(id);
  });
  test('зламане сховище не кидає', () => {
    expect(playerId(brokenStorage())).toMatch(/^[0-9a-f]{16}$/);
    expect(loadNick(brokenStorage())).toBeNull();
    expect(saveNick(brokenStorage(), 'Сашко')).toBe(false);
    expect(pendingResult(brokenStorage())).toBeNull();
    expect(() => enqueueResult(brokenStorage(), { height: 10, timeSec: 10 })).not.toThrow();
  });
  test('зберігає лише валідний нік', () => {
    const s = memStorage();
    expect(saveNick(s, '  Ко ля ')).toBe(true);
    expect(loadNick(s)).toBe('Ко ля');
    expect(saveNick(s, 'хуй')).toBe(false);
    expect(loadNick(s)).toBe('Ко ля');
  });
});

describe('черга', () => {
  test('лише найкращий, без дублів, без неправдоподібних', () => {
    const s = memStorage();
    enqueueResult(s, { height: 100, timeSec: 60 });
    enqueueResult(s, { height: 100, timeSec: 60 });
    enqueueResult(s, { height: 80, timeSec: 60 });
    expect(pendingResult(s)).toEqual({ height: 100, timeSec: 60 });
    enqueueResult(s, { height: 120, timeSec: 60 });
    expect(pendingResult(s)).toEqual({ height: 120, timeSec: 60 });
    enqueueResult(s, { height: maxHeightPoints(60) + 50, timeSec: 60 });
    expect(pendingResult(s)).toEqual({ height: 120, timeSec: 60 });
  });
  test('сміття в сховищі → null', () => {
    const s = memStorage();
    s.setItem('slime-climb.lb.pending', '{oops');
    expect(pendingResult(s)).toBeNull();
  });
});

describe('flush', () => {
  const ready = () => {
    const s = memStorage();
    saveNick(s, 'Сашко');
    enqueueResult(s, { height: 100, timeSec: 60 });
    return s;
  };

  test('без адреси нічого не шле', async () => {
    const f = vi.fn();
    expect(await flush(ready(), { url: '', fetchFn: f })).toEqual({ status: 'disabled' });
    expect(f).not.toHaveBeenCalled();
  });
  test('без ніка — nonick, черга лишається', async () => {
    const s = memStorage();
    enqueueResult(s, { height: 100, timeSec: 60 });
    expect((await flush(s, opts(reply(200, {})))).status).toBe('nonick');
    expect(pendingResult(s)).not.toBeNull();
  });
  test('порожня черга — empty', async () => {
    const s = memStorage();
    saveNick(s, 'Сашко');
    expect((await flush(s, opts(reply(200, {})))).status).toBe('empty');
  });
  test('200 → sent, черга порожня, тіло правильне', async () => {
    const s = ready();
    const f = vi.fn(reply(200, { rank: 3, best: 150 }));
    expect(await flush(s, opts(f))).toEqual({ status: 'sent', rank: 3, best: 150 });
    expect(pendingResult(s)).toBeNull();
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`${URL}/score`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ id: playerId(s), nick: 'Сашко', height: 100, timeSec: 60 });
  });
  test.each([
    ['500', reply(500, {})],
    ['мережа', async () => { throw new Error('net'); }],
    ['не JSON', reply(200, 'oops')],
    ['таймаут', () => new Promise(() => {})],
  ])('%s → offline, черга лишається', async (_, f) => {
    const s = ready();
    expect((await flush(s, opts(f, 20))).status).toBe('offline');
    expect(pendingResult(s)).toEqual({ height: 100, timeSec: 60 });
  });
  test('429 → later, черга лишається', async () => {
    const s = ready();
    expect((await flush(s, opts(reply(429, { error: 'too_often' })))).status).toBe('later');
    expect(pendingResult(s)).toEqual({ height: 100, timeSec: 60 });
  });
  test('422 → rejected, черга порожня', async () => {
    const s = ready();
    expect((await flush(s, opts(reply(422, { error: 'implausible' })))).status).toBe('rejected');
    expect(pendingResult(s)).toBeNull();
  });
});

describe('fetchTop і sendNick', () => {
  test('fetchTop', async () => {
    const s = memStorage();
    const f = vi.fn(reply(200, { top: [{ nick: 'А', height: 5 }], me: { rank: 1, height: 5 } }));
    expect(await fetchTop(s, opts(f))).toEqual({ status: 'ok', top: [{ nick: 'А', height: 5 }], me: { rank: 1, height: 5 } });
    expect(f.mock.calls[0][0]).toBe(`${URL}/top?id=${playerId(s)}`);
    expect((await fetchTop(s, opts(async () => { throw new Error('x'); }))).status).toBe('offline');
    expect((await fetchTop(s, { url: '' })).status).toBe('disabled');
  });
  test('sendNick', async () => {
    const s = memStorage();
    expect(await sendNick(s, '  Ко ля ', opts(reply(200, { ok: true })))).toBe('ok');
    expect(loadNick(s)).toBe('Ко ля');
    expect(await sendNick(s, 'хуй', opts(reply(200, { ok: true })))).toBe('invalid');
    expect(loadNick(s)).toBe('Ко ля');
    expect(await sendNick(s, 'Новий', opts(async () => { throw new Error('x'); }))).toBe('offline');
    expect(loadNick(s)).toBe('Новий');
    expect(await sendNick(s, 'Третій', { url: '' })).toBe('disabled');
    expect(loadNick(s)).toBe('Третій');
  });
});

describe('statusLine', () => {
  test.each([
    [{ eligible: false }, 'Не Норма — у таблицю не йде'],
    [{ eligible: true }, 'Надсилається…'],
    [{ eligible: true, result: { status: 'disabled' } }, ''],
    [{ eligible: true, result: { status: 'empty' } }, ''],
    [{ eligible: true, result: { status: 'nonick' } }, 'Введи нік — тапни тут'],
    [{ eligible: true, result: { status: 'sent', rank: 7 } }, 'Твоє місце: 7'],
    [{ eligible: true, result: { status: 'rejected' } }, 'Результат не прийнято'],
    [{ eligible: true, result: { status: 'offline' } }, 'Офлайн — надішлемо пізніше'],
    [{ eligible: true, result: { status: 'later' } }, 'Надішлемо трохи згодом'],
  ])('%j', (st, line) => expect(statusLine(st)).toBe(line));
});
