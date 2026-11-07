import { describe, expect, test } from 'vitest';
import {
  CARD_IDS,
  addXp,
  applyCard,
  availableCards,
  createProgression,
  rollCards,
  xpToNext,
} from '../src/systems/Progression.js';

function seq(...values) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('xpToNext', () => {
  test('curve 10 × 1.4^(level-1), rounded', () => {
    expect(xpToNext(1)).toBe(10);
    expect(xpToNext(2)).toBe(14);
    expect(xpToNext(3)).toBe(20);
  });
});

describe('addXp', () => {
  test('below threshold → no level', () => {
    const r = addXp(createProgression(), 9);
    expect(r.levelsGained).toBe(0);
    expect(r.progression.xp).toBe(9);
  });

  test('exactly the threshold → level 2 with 0 xp', () => {
    const r = addXp(createProgression(), 10);
    expect(r.levelsGained).toBe(1);
    expect(r.progression.level).toBe(2);
    expect(r.progression.xp).toBe(0);
  });

  test('a big reward carries over several levels (10+14+20=44, 16 left)', () => {
    const r = addXp(createProgression(), 60);
    expect(r.levelsGained).toBe(3);
    expect(r.progression.level).toBe(4);
    expect(r.progression.xp).toBe(16);
  });

  test('does not mutate the input', () => {
    const p = createProgression();
    addXp(p, 60);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(0);
  });
});

describe('cards', () => {
  test('fresh weapon matches BALANCE', () => {
    expect(createProgression().weapon).toEqual({ fireIntervalMs: 1000, damage: 1, slow: null });
  });

  test('rollCards returns 3 different ids from the pool', () => {
    const cards = rollCards(createProgression(), seq(0.9, 0.1, 0.5));
    expect(cards).toHaveLength(3);
    expect(new Set(cards).size).toBe(3);
    for (const c of cards) expect(CARD_IDS).toContain(c);
  });

  test('attackSpeed is unavailable at minimum interval → only 2 cards', () => {
    let p = createProgression();
    p = { ...p, weapon: { ...p.weapon, fireIntervalMs: 250 } };
    expect(availableCards(p)).not.toContain('attackSpeed');
    const cards = rollCards(p, seq(0, 0, 0));
    expect(cards).toHaveLength(2);
    expect(cards).not.toContain('attackSpeed');
  });

  test('attackSpeed: ×0.85, never below minFireIntervalMs', () => {
    const p = applyCard(createProgression(), 'attackSpeed');
    expect(p.weapon.fireIntervalMs).toBe(850);
    const near = { ...p, weapon: { ...p.weapon, fireIntervalMs: 260 } };
    expect(applyCard(near, 'attackSpeed').weapon.fireIntervalMs).toBe(250);
  });

  test('damage: first pick +1, every next pick +2', () => {
    const p1 = applyCard(createProgression(), 'damage');
    expect(p1.weapon.damage).toBe(2);
    const p2 = applyCard(p1, 'damage');
    expect(p2.weapon.damage).toBe(4);
    expect(applyCard(p2, 'damage').weapon.damage).toBe(6);
  });

  test('slow: first pick 0.6 for 2000 ms, next pick +1000 ms', () => {
    const once = applyCard(createProgression(), 'slow');
    expect(once.weapon.slow).toEqual({ factor: 0.6, durationMs: 2000 });
    expect(applyCard(once, 'slow').weapon.slow.durationMs).toBe(3000);
  });

  test('picks are counted', () => {
    const p = applyCard(applyCard(createProgression(), 'damage'), 'damage');
    expect(p.picks.damage).toBe(2);
  });
});

import { killXp } from '../src/systems/Progression.js';

test('killXp per enemy type and boss', () => {
  expect(killXp('lion')).toBe(5);
  expect(killXp('smallSpider')).toBe(1);
  expect(killXp('boss')).toBe(60);
});
