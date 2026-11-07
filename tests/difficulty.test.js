import { describe, expect, test } from 'vitest';
import { scrollSpeed, spawnIntervalMs } from '../src/systems/Difficulty.js';

describe('scrollSpeed', () => {
  test('starts at scrollBase', () => expect(scrollSpeed(0, false)).toBe(120));
  test('grows linearly with time', () => expect(scrollSpeed(100, false)).toBeCloseTo(230, 9));
  test('is capped at maxScrollSpeed', () => expect(scrollSpeed(10000, false)).toBe(520));
  test('is slowed by bossScrollFactor while boss is active', () =>
    expect(scrollSpeed(100, true)).toBeCloseTo(69, 9));
});

describe('spawnIntervalMs', () => {
  test('starts at spawnBaseMs', () => expect(spawnIntervalMs('bat', 0)).toBe(4000));
  test('reaches spawnMinFactor at 180 s', () => expect(spawnIntervalMs('bat', 180)).toBe(1600));
  test('stays constant after 180 s', () => expect(spawnIntervalMs('bat', 999)).toBe(1600));
  test('is linear in between', () => expect(spawnIntervalMs('bat', 90)).toBe(2800));
});
