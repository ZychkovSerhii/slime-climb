import { describe, expect, test } from 'vitest';
import { REWARD_STEPS } from '../src/config/ads.js';
import { canWatchRewarded, grantReward } from '../src/systems/Ads.js';
import { emptyMeta, normalizeMeta } from '../src/systems/Meta.js';

describe('нагорода за рекламу', () => {
  test('canWatchRewarded: false лише в режимі off, ліміту частоти немає', () => {
    expect(canWatchRewarded('off')).toBe(false);
    expect(canWatchRewarded('stub')).toBe(true);
  });
  test('grantReward додає рівно REWARD_STEPS, можна підряд скільки завгодно', () => {
    let m = { ...emptyMeta(), steps: 10 };
    for (let i = 0; i < 5; i++) m = grantReward(m);
    expect(m.steps).toBe(10 + 5 * REWARD_STEPS);
  });
  test('старий збережений adAt нічого не ламає', () => {
    expect(normalizeMeta({ steps: 7, adAt: 12345 }).steps).toBe(7);
    expect(normalizeMeta({ adAt: 12345 })).not.toHaveProperty('adAt');
  });
});
