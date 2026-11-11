import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import * as W from '../src/systems/Weapons.js';
import {
  attackDamage,
  axeRadius,
  createFireState,
  inRadius,
  shotgunAngles,
  stepFire,
  weaponJumpMul,
} from '../src/systems/Weapons.js';

/** Скільки атак за ms при постійній цілі, кроком 10 мс. */
function attacksIn(ms, opts) {
  let s = createFireState();
  let n = 0;
  for (let t = 0; t < ms; t += 10) {
    const r = stepFire(s, 10, { hasTarget: true, ...opts });
    s = r.state;
    if (r.fire) n += 1;
  }
  return n;
}

describe('damage', () => {
  test('base shot ×1, axe ×4, shotgun ×1.25 per pellet; Урон bonus is included', () => {
    expect(attackDamage(null, 3)).toBe(3);
    expect(attackDamage('axe', 1)).toBe(4);
    expect(attackDamage('axe', 4)).toBe(16);
    expect(attackDamage('shotgun', 2)).toBe(2.5);
    expect(attackDamage('chakra', 2)).toBe(2);
  });
});

describe('fire timing', () => {
  test('base shot: once per fireIntervalMs', () => {
    expect(attacksIn(3000, { main: null, fireIntervalMs: 1000 })).toBe(3);
  });

  test('axe swings 1.5× less often', () => {
    expect(attacksIn(3000, { main: 'axe', fireIntervalMs: 1000 })).toBe(2);
  });

  test('chakra: burst of 8, then reload ×2', () => {
    const c = BALANCE.weapons.chakra;
    const burstMs = (c.burst - 1) * c.burstGapMs;
    expect(attacksIn(burstMs + 10, { main: 'chakra', fireIntervalMs: 1000 })).toBe(8);
    // 8 у першій черзі, далі перезарядка 2000 мс — нічого
    expect(attacksIn(burstMs + 1990, { main: 'chakra', fireIntervalMs: 1000 })).toBe(8);
    expect(attacksIn(burstMs + 2010, { main: 'chakra', fireIntervalMs: 1000 })).toBe(9);
  });

  test('no target → no attack, but ready immediately when a target appears', () => {
    let r = stepFire(createFireState(), 500, { main: null, fireIntervalMs: 1000, hasTarget: false });
    expect(r.fire).toBe(false);
    r = stepFire(r.state, 10, { main: null, fireIntervalMs: 1000, hasTarget: true });
    expect(r.fire).toBe(true);
  });

  test('chakra burst survives a moment without a target', () => {
    let s = createFireState();
    s = stepFire(s, 10, { main: 'chakra', fireIntervalMs: 1000, hasTarget: true }).state;
    expect(s.burstLeft).toBe(7);
    s = stepFire(s, 500, { main: 'chakra', fireIntervalMs: 1000, hasTarget: false }).state;
    expect(s.burstLeft).toBe(7);
    const r = stepFire(s, 10, { main: 'chakra', fireIntervalMs: 1000, hasTarget: true });
    expect(r.fire).toBe(true);
    expect(r.state.burstLeft).toBe(6);
  });
});

describe('geometry', () => {
  test('axe radius is 1/3 of screen width', () => {
    expect(axeRadius(720)).toBe(240);
  });

  test('inRadius keeps targets inside the circle (border included)', () => {
    const c = { x: 0, y: 0 };
    const t = [{ x: 240, y: 0 }, { x: 169, y: 169 }, { x: 241, y: 0 }, { x: 0, y: -100 }];
    expect(inRadius(c, t, 240)).toEqual([t[0], t[1], t[3]]);
  });

  test('inRadius counts the target size (a big boss is hit by its edge)', () => {
    const boss = { x: 300, y: 0, size: 80 };
    expect(inRadius({ x: 0, y: 0 }, [boss], 240)).toEqual([]);
    expect(inRadius({ x: 0, y: 0 }, [boss], 240, (t) => t.size)).toEqual([boss]);
  });

  test('shotgun: aim and ±25°', () => {
    const [a, b, c] = shotgunAngles(1);
    expect(a).toBe(1);
    expect(b - 1).toBeCloseTo((25 * Math.PI) / 180);
    expect(1 - c).toBeCloseTo((25 * Math.PI) / 180);
  });

  test('chakra jumps 50% faster, others normal', () => {
    expect(weaponJumpMul('chakra')).toBe(1.5);
    expect(weaponJumpMul('axe')).toBe(1);
    expect(weaponJumpMul(null)).toBe(1);
  });
});

describe('weapon upgrades (feedback-2)', () => {
  test('+0.35 damage per upgrade on top of the weapon multiplier', () => {
    expect(W.attackDamage('axe', 1, 0)).toBe(4);
    expect(W.attackDamage('axe', 1, 2)).toBeCloseTo(4.7);
    expect(W.attackDamage('shotgun', 2, 1)).toBeCloseTo(2.85);
    expect(W.attackDamage(null, 2, 3)).toBe(2); // стартовий постріл не прокачується
  });
  test('axe: bigger radius, faster swings, mini axe at 5', () => {
    expect(W.axeRadius(720, 1)).toBeCloseTo(720 / 3 * 1.06);
    expect(W.upgradeIntervalMul('axe', 2)).toBeCloseTo(0.92 ** 2);
    expect(W.hasMiniAxe('axe', 4)).toBe(false);
    expect(W.hasMiniAxe('axe', 5)).toBe(true);
    expect(W.hasMiniAxe('shotgun', 5)).toBe(false);
  });
  test('shotgun: +8% speed, 2 extra pellets from level 3', () => {
    expect(W.upgradeIntervalMul('shotgun', 1)).toBeCloseTo(1 / 1.08);
    expect(W.shotgunAngles(0, 2)).toHaveLength(3);
    expect(W.shotgunAngles(0, 3)).toHaveLength(5);
  });
  test('chakra: +10% speed, burst +4 from level 3', () => {
    expect(W.chakraBurst(2)).toBe(8);
    expect(W.chakraBurst(3)).toBe(12);
    let st = W.createFireState();
    let shots = 0;
    for (let i = 0; i < 12; i++) {
      const r = W.stepFire(st, 1000, { main: 'chakra', fireIntervalMs: 1000, hasTarget: true, upgrades: 3 });
      st = r.state;
      if (r.fire) shots++;
      if (st.burstLeft === 0) break;
    }
    expect(shots).toBe(12);
    expect(st.cooldownMs).toBeCloseTo(2000 / 1.1 ** 3);
  });
});
