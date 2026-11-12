import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { scrollSpeed, spawnIntervalMs } from '../src/systems/Difficulty.js';

describe('scrollSpeed', () => {
  test('starts at scrollBase', () => expect(scrollSpeed(0, false)).toBe(120));
  test('grows linearly with time', () => expect(scrollSpeed(100, false)).toBeCloseTo(230, 9));
  test('is capped at maxScrollSpeed', () => expect(scrollSpeed(10000, false)).toBe(520));
  test('is slowed by bossScrollFactor while boss is active', () =>
    expect(scrollSpeed(100, true)).toBeCloseTo(69, 9));
});

describe('spawnIntervalMs', () => {
  test('starts at spawnBaseMs', () => expect(spawnIntervalMs('bat', 0)).toBe(4200));
  test('reaches spawnMinFactor at 180 s', () => expect(spawnIntervalMs('bat', 180)).toBe(1680));
  test('stays constant after 180 s', () => expect(spawnIntervalMs('bat', 999)).toBe(1680));
  test('is linear in between', () => expect(spawnIntervalMs('bat', 90)).toBe(2940));
});

test('бамбук: інтервали ×0,9 від зими (на ~10% більше ворогів)', async () => {
  const { BALANCE } = await import('../src/config/balance.js');
  const { spawnIntervalMs } = await import('../src/systems/Difficulty.js');
  const W = BALANCE.winter.spawnBaseMs;
  const B = BALANCE.bamboo.spawnBaseMs;
  expect(B.lantern).toBe(Math.round(W.elf * 0.9));
  expect(B.bat).toBe(Math.round(W.bat * 0.9));
  expect(B.ninja).toBe(Math.round(W.penguin * 0.9));
  expect(spawnIntervalMs('ninja', 0, 'bamboo')).toBe(B.ninja);
});

test('етап 11: лава ×0,9 від бамбука (саламандра ← ніндзя, іскра ← ліхтарик, кажан ← кажан)', () => {
  const B = BALANCE.bamboo.spawnBaseMs;
  const L = BALANCE.lava.spawnBaseMs;
  expect(L.salamander).toBe(Math.round(B.ninja * 0.9));
  expect(L.spark).toBe(Math.round(B.lantern * 0.9));
  expect(L.bat).toBe(Math.round(B.bat * 0.9));
  expect(spawnIntervalMs('salamander', 0, 'lava')).toBe(L.salamander);
});
