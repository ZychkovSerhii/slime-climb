import { describe, expect, test } from 'vitest';
import { REWARD_COOLDOWN_MS, REWARD_STEPS } from '../src/config/ads.js';
import { canWatchRewarded, grantReward, rewardCooldownLeftMs } from '../src/systems/Ads.js';
import { emptyMeta, normalizeMeta } from '../src/systems/Meta.js';

const NOW = 1_000_000;

describe('нагорода за рекламу', () => {
  test('без adAt кулдауну немає', () => {
    expect(rewardCooldownLeftMs(emptyMeta(), NOW)).toBe(0);
  });
  test('кулдаун рахується від останнього перегляду', () => {
    expect(rewardCooldownLeftMs({ ...emptyMeta(), adAt: NOW - 30000 }, NOW)).toBe(REWARD_COOLDOWN_MS - 30000);
  });
  test('час у майбутньому не блокує назавжди', () => {
    expect(rewardCooldownLeftMs({ ...emptyMeta(), adAt: NOW + 999999 }, NOW)).toBe(0);
  });
  test('canWatchRewarded: false у режимі off і під час кулдауну, true після', () => {
    const m = { ...emptyMeta(), adAt: NOW - 1000 };
    expect(canWatchRewarded(emptyMeta(), NOW, 'off')).toBe(false);
    expect(canWatchRewarded(m, NOW, 'stub')).toBe(false);
    expect(canWatchRewarded(m, NOW + REWARD_COOLDOWN_MS, 'stub')).toBe(true);
  });
  test('grantReward додає рівно REWARD_STEPS і ставить adAt', () => {
    const r = grantReward({ ...emptyMeta(), steps: 10 }, NOW);
    expect(r.steps).toBe(10 + REWARD_STEPS);
    expect(r.adAt).toBe(NOW);
  });
  test('normalizeMeta: зламаний adAt → 0, коректний зберігається', () => {
    expect(normalizeMeta({ adAt: -5 }).adAt).toBe(0);
    expect(normalizeMeta({ adAt: 'x' }).adAt).toBe(0);
    expect(normalizeMeta({ adAt: 12345 }).adAt).toBe(12345);
  });
});
