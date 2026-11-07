import { describe, expect, test } from 'vitest';
import {
  activateInvis, applyDot, breakArmor, cardLoot, createArmor, createInvis, hatStats, hitEffects, invisCharge,
  invisReady, invisStats, isInvisible, jumpMul, LOOT_IDS, lootCard, maxLivesFor, rollLoot, stepArmor, stepDot,
} from '../src/systems/Skills.js';
import { applyCard, availableCards, createProgression } from '../src/systems/Progression.js';
import { BALANCE } from '../src/config/balance.js';

describe('invisibility', () => {
  test('stats grow with picks: +2 s duration, −5 s cooldown', () => {
    expect(invisStats(0)).toBeNull();
    expect(invisStats(1)).toEqual({ durationMs: 8000, cooldownMs: 60000 });
    expect(invisStats(3)).toEqual({ durationMs: 12000, cooldownMs: 50000 });
    expect(invisStats(50).cooldownMs).toBe(BALANCE.skills.invisibility.cdMinMs);
  });
  test('activation, duration and cooldown', () => {
    const st = invisStats(1);
    let inv = createInvis();
    expect(invisReady(inv, 0)).toBe(true);
    inv = activateInvis(inv, st, 1000);
    expect(isInvisible(inv, 8999)).toBe(true);
    expect(isInvisible(inv, 9000)).toBe(false);
    expect(activateInvis(inv, st, 30000)).toBe(inv); // ще перезаряджається
    expect(invisCharge(inv, st, 31000)).toBeCloseTo(0.5);
    expect(invisReady(inv, 61000)).toBe(true);
  });
  test('without the skill the button does nothing', () => {
    const inv = createInvis();
    expect(activateInvis(inv, null, 0)).toBe(inv);
  });
});

test('hat: damage 1, +3, +5, +5; 5th pick adds a second hat', () => {
  expect(hatStats(0)).toEqual({ count: 0, damage: 0 });
  expect(hatStats(1)).toEqual({ count: 1, damage: 1 });
  expect(hatStats(2)).toEqual({ count: 1, damage: 4 });
  expect(hatStats(4)).toEqual({ count: 1, damage: 14 });
  expect(hatStats(5)).toEqual({ count: 2, damage: 14 });
});

test('extra life: +1 max heart each, up to 5; then the card disappears', () => {
  expect(maxLivesFor(0)).toBe(BALANCE.maxLives);
  expect(maxLivesFor(10)).toBe(5);
  let p = createProgression();
  while (availableCards(p).includes('extraLife')) p = applyCard(p, 'extraLife');
  expect(maxLivesFor(p.picks.extraLife)).toBe(5);
});

test('hat card disappears after 5 picks', () => {
  let p = createProgression();
  for (let i = 0; i < 5; i++) p = applyCard(p, 'hat');
  expect(availableCards(p)).not.toContain('hat');
});

describe('spider loot', () => {
  test('2 random not-taken cards; fewer when almost all taken', () => {
    const cards = rollLoot([], Math.random);
    expect(cards).toHaveLength(2);
    expect(new Set(cards).size).toBe(2);
    expect(rollLoot(LOOT_IDS.slice(0, 4), Math.random)).toEqual([lootCard(LOOT_IDS[4])]);
    expect(rollLoot(LOOT_IDS, Math.random)).toEqual([]);
  });
  test('taking a loot card records a relic once and nothing else changes', () => {
    let p = applyCard(createProgression(), lootCard('venom'));
    p = applyCard(p, lootCard('venom'));
    expect(p.relics).toEqual(['venom']);
    expect(p.weapon).toEqual(createProgression().weapon);
    expect(cardLoot('loot:web')).toBe('web');
    expect(cardLoot('damage')).toBeNull();
  });
  test('jump multiplier is capped', () => {
    expect(jumpMul(1, true)).toBeCloseTo(1.8);
    expect(jumpMul(1.5, true)).toBe(BALANCE.bossLoot.maxJumpMul);
    expect(jumpMul(1.5, false)).toBe(1.5);
  });
  test('armor: absorbs a hit, comes back after 22 s', () => {
    let a = createArmor();
    a = breakArmor(a, 1000);
    expect(a.on).toBe(false);
    expect(stepArmor(a, 22999).on).toBe(false);
    expect(stepArmor(a, 23000).on).toBe(true);
  });
  test('hit effects: venom gives the stronger slow and a dot; web roots', () => {
    const card = { factor: 0.6, durationMs: 2000 };
    expect(hitEffects(card, ['venom']).slow).toBe(card); // картка сильніша — лишається вона
    expect(hitEffects(null, ['venom']).slow.factor).toBe(0.9);
    expect(hitEffects(null, ['venom']).dot).toEqual({ dps: 1, durationMs: 3000 });
    expect(hitEffects(null, []).root).toBeNull();
    expect(hitEffects(null, ['web']).root).toEqual({ ms: 900, bossMs: 150 });
  });
  test('dot: 1 damage per second for 3 s, refresh does not stack', () => {
    let d = applyDot(null, { dps: 1, durationMs: 3000 }, 0);
    let total = 0;
    for (let t = 0; t <= 5000; t += 100) {
      const r = stepDot(d, t);
      d = r.state;
      total += r.damage;
    }
    expect(total).toBe(3);
    expect(d).toBeNull();
    const a = applyDot(null, { dps: 1, durationMs: 3000 }, 0);
    const b = applyDot(a, { dps: 1, durationMs: 3000 }, 500);
    expect(b.nextTickAt).toBe(1000);
    expect(b.until).toBe(3500);
  });
});
