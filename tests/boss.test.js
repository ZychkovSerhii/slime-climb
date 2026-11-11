import { describe, expect, test } from 'vitest';
import {
  afterBossSpawnMul,
  attackTimings,
  bannerVisible,
  bossStage,
  hazardsSuppressed,
  isRage,
  nextSwarmSize,
  pickRageAt,
  pickStrikeX,
  shouldStartSwarm,
  isSpitAttack,
  spitAngles,
} from '../src/systems/BossPlanner.js';
import { BALANCE } from '../src/config/balance.js';

const B = BALANCE.boss;

describe('bossStage', () => {
  const at = 120;
  test('before → prep (4 s before) → fight', () => {
    expect(bossStage(115.9, { atSec: at })).toBe('before');
    expect(bossStage(116, { atSec: at })).toBe('prep');
    expect(bossStage(119.9, { atSec: at })).toBe('prep');
    expect(bossStage(120, { atSec: at })).toBe('fight');
    expect(bossStage(500, { atSec: at })).toBe('fight');
  });
  test('after the kill: 6 s calm, then after', () => {
    expect(bossStage(150, { atSec: at, killedAtSec: 150 })).toBe('calm');
    expect(bossStage(155.9, { atSec: at, killedAtSec: 150 })).toBe('calm');
    expect(bossStage(156, { atSec: at, killedAtSec: 150 })).toBe('after');
  });
  test('custom start time (debug ?boss=1)', () => {
    expect(bossStage(1.9, { atSec: 6 })).toBe('before');
    expect(bossStage(2, { atSec: 6 })).toBe('prep');
  });
});

test('banner: the last 2 s before the boss', () => {
  expect(bannerVisible(117.9, 120)).toBe(false);
  expect(bannerVisible(118, 120)).toBe(true);
  expect(bannerVisible(119.99, 120)).toBe(true);
  expect(bannerVisible(120, 120)).toBe(false);
});

test('spikes and ordinary enemies are suppressed in prep, fight and calm', () => {
  expect(['before', 'prep', 'fight', 'calm', 'after'].map(hazardsSuppressed)).toEqual([false, true, true, true, false]);
});

describe('afterBossSpawnMul', () => {
  test('1 before the kill', () => expect(afterBossSpawnMul(100, null)).toBe(1));
  test('starts at afterRampMul when the calm ends and returns to 1 over afterRampSec', () => {
    const k = 150;
    const end = k + B.calmSec;
    expect(afterBossSpawnMul(end, k)).toBeCloseTo(B.afterRampMul, 9);
    expect(afterBossSpawnMul(end + B.afterRampSec / 2, k)).toBeCloseTo((B.afterRampMul + 1) / 2, 9);
    expect(afterBossSpawnMul(end + B.afterRampSec, k)).toBe(1);
    expect(afterBossSpawnMul(end + 999, k)).toBe(1);
  });
});

describe('pickStrikeX', () => {
  const lane = [84, 636];

  test('rng→0: strike above the player (±40 px) and inside the lane', () => {
    const x = pickStrikeX(300, () => 0, ...lane);
    expect(Math.abs(x - 300)).toBeLessThanOrEqual(40);
  });

  test('player at the lane edge → result is clamped to the lane', () => {
    for (const r of [0, 0.3, 0.59, 0.99]) {
      for (const x of [pickStrikeX(lane[0], () => r, ...lane), pickStrikeX(lane[1], () => r, ...lane)]) {
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

describe('phases', () => {
  test('swarm starts at 75% HP, once', () => {
    expect(shouldStartSwarm(31, 40, false)).toBe(false);
    expect(shouldStartSwarm(30, 40, false)).toBe(true);
    expect(shouldStartSwarm(10, 40, true)).toBe(false);
  });

  test('rage threshold is random in 35–40%', () => {
    expect(pickRageAt(() => 0)).toBeCloseTo(0.35, 9);
    expect(pickRageAt(() => 0.999999)).toBeCloseTo(0.4, 5);
    expect(isRage(16, 40, 0.4)).toBe(true);
    expect(isRage(17, 40, 0.4)).toBe(false);
  });

  test('rage: attacks are 30–40% faster', () => {
    const calm = attackTimings(false);
    const rage = attackTimings(true);
    expect(calm).toEqual({ telegraphMs: B.telegraphMs, dropSpeed: B.dropSpeed, retreatSpeed: B.retreatSpeed, restMs: B.restMs });
    for (const k of ['telegraphMs', 'restMs']) {
      const r = calm[k] / rage[k];
      expect(r).toBeGreaterThanOrEqual(1.3);
      expect(r).toBeLessThanOrEqual(1.4);
    }
    const r = rage.dropSpeed / calm.dropSpeed;
    expect(r).toBeGreaterThanOrEqual(1.3);
    expect(r).toBeLessThanOrEqual(1.4);
  });
});

describe('nextSwarmSize', () => {
  test('survivors come back with +1, even if nobody was hit', () => {
    expect(nextSwarmSize(12)).toBe(13);
    expect(nextSwarmSize(5)).toBe(6);
  });
  test('capped at 18 (feedback-2: 20 → 18)', () => {
    expect(nextSwarmSize(18)).toBe(18);
    expect(nextSwarmSize(17)).toBe(18);
  });
  test('all killed → swarm is over', () => expect(nextSwarmSize(0)).toBe(0));
  test('killing 2 per pass always ends the swarm (no endless swarm)', () => {
    let n = B.swarm.start;
    for (let pass = 0; pass < 100 && n > 0; pass++) n = nextSwarmSize(Math.max(n - 2, 0));
    expect(n).toBe(0);
  });
});

describe('web spit (balance fixes after 4a)', () => {
  test('every spit.every-th attack is a spit, the rest are strikes', () => {
    const e = B.spit.every;
    expect(isSpitAttack(1)).toBe(false);
    expect(isSpitAttack(e)).toBe(true);
    expect(isSpitAttack(e + 1)).toBe(false);
    expect(isSpitAttack(2 * e)).toBe(true);
    expect(isSpitAttack(B.spit.rageEvery, true)).toBe(true);
  });
  test('fan is centred on the aim; rage adds balls', () => {
    const a = spitAngles(1, false);
    expect(a).toHaveLength(B.spit.count);
    expect(a.reduce((x, y) => x + y, 0) / a.length).toBeCloseTo(1);
    expect(spitAngles(1, true)).toHaveLength(B.spit.rageCount);
  });
  test('after a spit the boss waits long enough for balls to cross the screen before the next strike', () => {
    // від hangY до гравця (~0.7 × 1280) грудка летить ~ (896 − 260) / speed; удар починається після recover + telegraph
    const flight = ((0.7 * 1280 - B.hangY) / B.spit.speed) * 1000;
    const strikeAt = (B.spit.recoverMs + B.telegraphMs) / B.rageSpeedMul;
    expect(strikeAt).toBeGreaterThan(flight * 0.75);
  });
});
