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
import { createSpikeState, planSpikes, spikeBand } from '../src/systems/SpikePlanner.js';
import { firstUnavoidableHit, mulberry32 } from './helpers/spikeFeasibility.js';

/** Генератор шипів так, як його використовує GameScene. */
function plannerGenerator(rng) {
  let state = null;
  return ({ tSec, distancePx }) => {
    if (tSec < BALANCE.spikeStartSec) return [];
    const scroll = scrollSpeed(tSec, false);
    if (!state) state = createSpikeState(distancePx, rng);
    const r = planSpikes(state, distancePx, scroll, rng);
    state = r.state;
    return r.spikes.map((s) => ({ side: s.side, y: -BALANCE.spikeHeight / 2 + (distancePx - s.w) }));
  };
}

/** Стара схема (кожна стіна окремо) — для контролю, що перевірка взагалі ловить проблему. */
function legacyGenerator(rng) {
  const next = { left: -BALANCE.spikeHeight, right: -BALANCE.spikeHeight - minSpikeGap(120) * rng() };
  return ({ tSec, dy }) => {
    const out = [];
    if (tSec < BALANCE.spikeStartSec) return out;
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
    for (let i = 1; i < all.length; i++) {
      expect(all[i].w).toBeGreaterThanOrEqual(all[i - 1].w); // у порядку появи
      expect(all[i].w - all[i - 1].w).toBeGreaterThanOrEqual(band - 1e-9);
    }
  });

  test('control: the old per-wall placement produces an unavoidable hit', () => {
    expect(firstUnavoidableHit(legacyGenerator(mulberry32(1)), 125)).not.toBeNull();
  });

  test.each([1, 2, 3])('perfect play survives 2:05 of spikes (seed %i)', (seed) => {
    expect(firstUnavoidableHit(plannerGenerator(mulberry32(seed)), 125)).toBeNull();
  }, 60000);
});
