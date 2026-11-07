import { expect, test } from 'vitest';
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
