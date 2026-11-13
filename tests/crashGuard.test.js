import { describe, expect, it } from 'vitest';
import { crashText, installCrashGuard, loadLastError, loopStalled, saveLastError } from '../src/systems/CrashGuard.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

function fakeWindow() {
  const listeners = {};
  const timers = [];
  const body = { children: [], append(n) { this.children.push(n); } };
  const node = () => ({ style: {}, textContent: '', append() {}, addEventListener(type, fn) { this[`on${type}`] = fn; } });
  return {
    listeners, timers, body,
    addEventListener: (t, fn) => { listeners[t] = fn; },
    setTimeout: (fn) => timers.push(fn),
    document: { createElement: node, body },
    location: { reload() {} },
  };
}

describe('CrashGuard', () => {
  it('crashText: повідомлення і короткий стек без адреси сторінки', () => {
    const e = new Error('boom');
    e.stack = 'Error: boom\n    at f (https://localhost/assets/index-abc.js:1:2)\n    at g (https://localhost/assets/index-abc.js:3:4)';
    const t = crashText(e, { maxLines: 1 });
    expect(t).toBe('boom\nat f (assets/index-abc.js:1:2)');
    expect(crashText('рядок')).toBe('рядок');
    expect(crashText(null)).toBe('невідома помилка');
  });

  it('loopStalled: кадр не змінився — гра стоїть', () => {
    expect(loopStalled(10, 10)).toBe(true);
    expect(loopStalled(10, 34)).toBe(false);
  });

  it('остання помилка зберігається і читається; сміття — null', () => {
    const s = memory();
    expect(loadLastError(s)).toBeNull();
    saveLastError(s, 'boom', 5);
    expect(loadLastError(s)).toEqual({ at: 5, text: 'boom' });
    expect(loadLastError({ getItem: () => '{' })).toBeNull();
  });

  it('екран з\'являється лише коли кадри стали', () => {
    const win = fakeWindow();
    let frame = 1;
    const guard = installCrashGuard({ frame: () => frame, win, storage: memory() });
    win.listeners.error({ error: new Error('у таймері') });
    frame = 2; // гра йде далі
    win.timers.shift()();
    expect(guard.isShown()).toBe(false);
    win.listeners.error({ error: new Error('у кадрі') });
    win.timers.shift()(); // кадр той самий
    expect(guard.isShown()).toBe(true);
    expect(win.body.children).toHaveLength(1);
  });

  it('помилка завантаження ресурсу (без error і message) ігнорується', () => {
    const win = fakeWindow();
    installCrashGuard({ frame: () => 1, win });
    win.listeners.error({});
    expect(win.timers).toHaveLength(0);
  });
});
