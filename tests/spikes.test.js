import { describe, expect, test } from 'vitest';
import { minSpikeGap, nextSpikeGap } from '../src/systems/SpikePlanner.js';

test('minSpikeGap = distance scrolled during a jump + player + spike', () => {
  expect(minSpikeGap(120)).toBeCloseTo(120 * 0.38 + 48 + 40, 10);
});

test('minSpikeGap grows with scroll speed', () => {
  expect(minSpikeGap(400)).toBeGreaterThan(minSpikeGap(120));
});

test('nextSpikeGap with rng=0 is exactly the minimum', () => {
  expect(nextSpikeGap(120, () => 0)).toBe(minSpikeGap(120));
});

test('nextSpikeGap stays below twice the minimum', () => {
  expect(nextSpikeGap(120, () => 0.999)).toBeLessThan(2 * minSpikeGap(120));
});

import { BALANCE } from '../src/config/balance.js';
import { scrollSpeed } from '../src/systems/Difficulty.js';
import { createSpikeState, planSpikes, prefillStartWorld, spikeBand } from '../src/systems/SpikePlanner.js';
import { firstUnavoidableHit, mulberry32 } from './helpers/spikeFeasibility.js';

/** Генератор шипів так, як його використовує GameScene. */
const PLAYER_Y = BALANCE.playerYRatio * 1280;

function plannerGenerator(rng, opts) {
  let state = null;
  return ({ tSec, distancePx }) => {
    const scroll = scrollSpeed(tSec, false);
    if (!state) state = createSpikeState(prefillStartWorld(distancePx, PLAYER_Y), rng);
    const r = planSpikes(state, distancePx, scroll, rng, opts);
    state = r.state;
    return r.spikes.map((s) => ({ side: s.side, y: -BALANCE.spikeHeight / 2 + (distancePx - s.w) }));
  };
}

/** Стара схема (кожна стіна окремо) — для контролю, що перевірка взагалі ловить проблему. */
function legacyGenerator(rng) {
  const next = { left: -BALANCE.spikeHeight, right: -BALANCE.spikeHeight - minSpikeGap(120) * rng() };
  return ({ tSec, dy }) => {
    const out = [];
    if (tSec < 3) return out;
    const s = scrollSpeed(tSec, false);
    for (const side of ['left', 'right']) {
      next[side] += dy;
      while (next[side] >= -BALANCE.spikeHeight) {
        out.push({ side, y: next[side] + BALANCE.spikeHeight / 2 });
        next[side] -= nextSpikeGap(s, rng);
      }
    }
    return out;
  };
}

describe('two-wall spike planner', () => {
  test('spikeBand = minSpikeGap measured at the scroll speed the spike will have at the player', () => {
    expect(spikeBand(120)).toBeGreaterThanOrEqual(minSpikeGap(120));
  });

  test('cross-wall and same-wall gaps never fall below the band', () => {
    const rng = mulberry32(7);
    let state = createSpikeState(0, rng);
    const all = [];
    for (let d = 0; d < 30000; d += 5) {
      const r = planSpikes(state, d, 200, rng);
      state = r.state;
      all.push(...r.spikes);
    }
    expect(all.length).toBeGreaterThan(50);
    const band = spikeBand(200);
    let combs = 0;
    for (let i = 1; i < all.length; i++) {
      const [a, b] = [all[i - 1], all[i]];
      expect(b.w).toBeGreaterThanOrEqual(a.w); // у порядку появи
      if (a.comb && b.comb && a.side === b.side && b.w - a.w === BALANCE.spikeHeight) continue; // всередині гребінки
      if (b.comb) combs += 1;
      expect(b.w - a.w).toBeGreaterThanOrEqual(band - 1e-9);
    }
    expect(combs).toBeGreaterThan(0);
  });

  test('comb: 4–6 adjacent spikes on one wall, the other wall stays free around it', () => {
    const rng = mulberry32(11);
    let state = createSpikeState(0, rng);
    const all = [];
    for (let d = 0; d < 60000; d += 5) {
      const r = planSpikes(state, d, 200, rng, { combChance: 0.5 });
      state = r.state;
      all.push(...r.spikes);
    }
    const band = spikeBand(200);
    const combs = [];
    for (const sp of all) {
      const last = combs[combs.length - 1];
      if (sp.comb && last && last.side === sp.side && sp.w - last.end === BALANCE.spikeHeight) last.end = sp.w;
      else if (sp.comb) combs.push({ side: sp.side, start: sp.w, end: sp.w });
    }
    expect(combs.length).toBeGreaterThan(5);
    for (const c of combs) {
      const n = Math.round((c.end - c.start) / BALANCE.spikeHeight) + 1;
      expect(n).toBeGreaterThanOrEqual(BALANCE.spikeComb.minCount);
      expect(n).toBeLessThanOrEqual(BALANCE.spikeComb.maxCount);
      const clash = all.filter((sp) => sp.side !== c.side && sp.w > c.start - band && sp.w < c.end + band);
      expect(clash).toEqual([]);
    }
    // гребінки не частіше ніж раз на minGapSec
    for (let i = 1; i < combs.length; i++) {
      expect(combs[i].start - combs[i - 1].end).toBeGreaterThanOrEqual(BALANCE.spikeComb.minGapSec * 200 - 1e-9);
    }
  });

  test('control: the old per-wall placement produces an unavoidable hit', () => {
    expect(firstUnavoidableHit(legacyGenerator(mulberry32(1)), 125)).not.toBeNull();
  });

  test.each([1, 2, 3])('perfect play survives 2:05 of spikes (seed %i)', (seed) => {
    expect(firstUnavoidableHit(plannerGenerator(mulberry32(seed)), 125)).toBeNull();
  }, 60000);

  test.each([4, 5])('perfect play survives 2:05 of spikes with frequent combs (seed %i)', (seed) => {
    expect(firstUnavoidableHit(plannerGenerator(mulberry32(seed), { combChance: 0.6 }), 125)).toBeNull();
  }, 60000);
});

describe('spikes at the start of a run', () => {
  test('screen is pre-filled: first spike reaches the player after spikeLeadSec, not ~9 s', () => {
    const rng = mulberry32(5);
    const state = createSpikeState(prefillStartWorld(0, PLAYER_Y), rng);
    const { spikes } = planSpikes(state, 0, BALANCE.scrollBase, rng);
    const ys = spikes.map((s) => -BALANCE.spikeHeight / 2 + (0 - s.w));
    expect(spikes.length).toBeGreaterThanOrEqual(3); // кілька шипів уже видно на екрані
    const lowest = Math.max(...ys);
    const zoneTop = PLAYER_Y - (BALANCE.playerSize + BALANCE.spikeHeight) / 2;
    const arrivalSec = (zoneTop - lowest) / BALANCE.scrollBase;
    expect(arrivalSec).toBeGreaterThanOrEqual(BALANCE.spikeLeadSec - 1e-9);
    expect(arrivalSec).toBeLessThanOrEqual(BALANCE.spikeLeadSec + 1.5);
    for (const y of ys) expect(y).toBeLessThan(zoneTop);
  });
});

describe('reaction slack', () => {
  test('band leaves spikeSlackSec of reaction time on top of a jump', () => {
    const scroll = 200;
    const tight = minSpikeGap(scroll);
    expect(spikeBand(scroll) - tight).toBeCloseTo(scroll * BALANCE.spikeSlackSec, 9);
  });
});
