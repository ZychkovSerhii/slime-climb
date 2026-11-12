import { describe, expect, test } from 'vitest';
import { defaultSettings, loadSettings, saveSettings } from '../src/systems/Settings.js';

const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => d[k] ?? null, setItem: (k, v) => (d[k] = v) };
};

describe('налаштування', () => {
  test('новий гравець — сніг і туман увімкнено', () => expect(loadSettings(mem())).toEqual({ snow: true, fog: true, embers: true }));
  test('старий запис без туману (до етапу 9): сніг не губиться, туман увімкнено', () => {
    expect(loadSettings(mem({ 'slime-climb.settings': '{"snow":false}' }))).toEqual({ snow: false, fog: true, embers: true });
    expect(loadSettings(mem({ 'slime-climb.settings': '{"fog":false}' }))).toEqual({ snow: true, fog: false, embers: true });
  });
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

describe('етап 11: іскри лави', () => {
  test('старі налаштування без embers — іскри увімкнені, сніг і туман збережені', () => {
    const store = { getItem: () => JSON.stringify({ snow: false, fog: false }) };
    expect(loadSettings(store)).toEqual({ snow: false, fog: false, embers: true });
  });
  test('embers зберігається', () => {
    const store = { getItem: () => JSON.stringify({ embers: false }) };
    expect(loadSettings(store).embers).toBe(false);
  });
});
