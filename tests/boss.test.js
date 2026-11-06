import { describe, expect, test } from 'vitest';
import { pickStrikeX, shouldStartBoss } from '../src/systems/BossPlanner.js';

describe('shouldStartBoss', () => {
  test('not before boss.atSec', () => expect(shouldStartBoss(119, 'none')).toBe(false));
  test('at boss.atSec when no boss yet', () => expect(shouldStartBoss(120, 'none')).toBe(true));
  test('not while active', () => expect(shouldStartBoss(130, 'active')).toBe(false));
  test('never again after the boss is dead', () => expect(shouldStartBoss(200, 'dead')).toBe(false));
  test('custom start time (debug ?boss=1)', () => {
    expect(shouldStartBoss(4.9, 'none', 5)).toBe(false);
    expect(shouldStartBoss(5, 'none', 5)).toBe(true);
  });
});

describe('pickStrikeX', () => {
  const lane = [84, 636];

  test('rng→0: strike above the player (±40 px) and inside the lane', () => {
    const x = pickStrikeX(300, () => 0, ...lane);
    expect(Math.abs(x - 300)).toBeLessThanOrEqual(40);
    expect(x).toBeGreaterThanOrEqual(lane[0]);
    expect(x).toBeLessThanOrEqual(lane[1]);
  });

  test('player at the lane edge → result is clamped to the lane', () => {
    for (const r of [0, 0.3, 0.59, 0.99]) {
      const left = pickStrikeX(lane[0], () => r, ...lane);
      const right = pickStrikeX(lane[1], () => r, ...lane);
      for (const x of [left, right]) {
        expect(x).toBeGreaterThanOrEqual(lane[0]);
        expect(x).toBeLessThanOrEqual(lane[1]);
      }
    }
  });

  test('rng ≥ strikeChance → random point anywhere in the lane', () => {
    let i = 0;
    const values = [0.9, 0.5];
    const x = pickStrikeX(300, () => values[i++], ...lane);
    expect(x).toBeCloseTo(lane[0] + 0.5 * (lane[1] - lane[0]), 9);
  });
});

import { canSpawnMinions } from '../src/systems/BossPlanner.js';

describe('canSpawnMinions', () => {
  test('only while the boss hangs at the top (rest, telegraph)', () => {
    expect(canSpawnMinions('rest')).toBe(true);
    expect(canSpawnMinions('telegraph')).toBe(true);
  });
  test('never during enter/strike/retreat — spiders would appear next to the player', () => {
    for (const s of ['enter', 'strike', 'retreat']) expect(canSpawnMinions(s)).toBe(false);
  });
});
