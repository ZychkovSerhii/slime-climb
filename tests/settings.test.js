import { describe, expect, test } from 'vitest';
import { defaultSettings, loadSettings, saveSettings } from '../src/systems/Settings.js';

const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => (d[k] = v) };
};

describe('налаштування', () => {
  test('новий гравець — сніг увімкнено', () => expect(loadSettings(mem())).toEqual({ snow: true }));
  test('зберігаються й читаються', () => {
    const st = mem();
    expect(saveSettings(st, { snow: false })).toBe(true);
    expect(loadSettings(st).snow).toBe(false);
  });
  test('зламаний запис → типові', () => {
    expect(loadSettings(mem({ 'slime-climb.settings': '{oops' }))).toEqual(defaultSettings());
    expect(loadSettings(mem({ 'slime-climb.settings': '{"snow":"no"}' }))).toEqual(defaultSettings());
  });
  test('без сховища не кидає', () => {
    expect(loadSettings(null)).toEqual(defaultSettings());
    expect(saveSettings(null, { snow: true })).toBe(false);
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(loadSettings(broken)).toEqual(defaultSettings());
    expect(saveSettings(broken, { snow: true })).toBe(false);
  });
});
