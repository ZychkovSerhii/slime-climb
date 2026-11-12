import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { otherSide, spikesBlock, walkerSide } from '../src/systems/WallWalkers.js';
import { createSpikeState, planSpikes, reserveFree } from '../src/systems/SpikePlanner.js';
import { killXp, xpToNext } from '../src/systems/Progression.js';
import { giftXp, rollGift } from '../src/systems/Biome.js';

function lcg(seed) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('wall walkers: side', () => {
  test('new walker goes to the wall without the player', () => {
    expect(walkerSide('left')).toBe('right');
    expect(walkerSide('right')).toBe('left');
  });
  test('all walkers share one wall even if the player moved', () => {
    expect(walkerSide('right', 'right')).toBe('right');
    expect(otherSide('left')).toBe('right');
  });
});

describe('spike planner: reserved walls', () => {
  test('no spike inside a reserved interval on that side; other side still gets spikes', () => {
    for (let seed = 1; seed < 40; seed++) {
      const rng = lcg(seed);
      let st = createSpikeState(0, rng);
      st = reserveFree(st, 'left', 1000, 2500);
      const r = planSpikes(st, 6000, BALANCE.scrollBase, rng, { combChance: 0.5 });
      const S = BALANCE.spikeHeight;
      for (const s of r.spikes.filter((x) => x.side === 'left')) {
        expect(s.w + S < 1000 || s.w > 2500).toBe(true);
      }
      expect(r.spikes.some((s) => s.side === 'right' && s.w > 1000 && s.w < 2500)).toBe(true);
    }
  });

  test('spikesBlock sees placed spikes in the interval', () => {
    const d = 3000;
    expect(spikesBlock([{ side: 'left', y: 500 }], 'left', { from: 2400, to: 2600 }, d)).toBe(true);
    expect(spikesBlock([{ side: 'right', y: 500 }], 'left', { from: 2400, to: 2600 }, d)).toBe(false);
    expect(spikesBlock([{ side: 'left', y: 100 }], 'left', { from: 2400, to: 2600 }, d)).toBe(false);
  });
});

describe('feedback-3: xp', () => {
  test('xp curve is flatter than before', () => {
    expect(BALANCE.xpGrowth).toBeCloseTo(1.22, 2);
    expect(xpToNext(20)).toBeLessThan(10 * 1.4 ** 19 / 10);
  });
  test('kill xp grows with the loop', () => {
    expect(killXp('lion', { biome: 0 })).toBe(BALANCE.enemies.lion.xp);
    expect(killXp('lion', { biome: 2 })).toBe(Math.round(BALANCE.enemies.lion.xp * BALANCE.scaling.biomeHpMul ** 2));
    expect(killXp('boss', { biome: 3 })).toBeGreaterThan(killXp('boss', { biome: 0 }));
  });
});

describe('feedback-3: gift bonus', () => {
  test('every kind can drop; life is rare and never with full lives', () => {
    const rng = lcg(3);
    const n = { xp: 0, steps: 0, shield: 0, life: 0 };
    for (let i = 0; i < 20000; i++) n[rollGift(rng)] += 1;
    for (const k of Object.keys(n)) expect(n[k]).toBeGreaterThan(0);
    expect(n.life).toBeLessThan(n.shield);
    for (let i = 0; i < 2000; i++) expect(rollGift(rng, { livesFull: true })).not.toBe('life');
  });
  test('xp share scales with the level', () => {
    expect(giftXp(xpToNext(1))).toBeGreaterThanOrEqual(1);
    expect(giftXp(xpToNext(15))).toBeGreaterThan(giftXp(xpToNext(5)));
  });
});
