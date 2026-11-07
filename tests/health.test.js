import { expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { applyDamage, createHealth } from '../src/systems/Health.js';

test('fresh health has maxLives and no invulnerability', () => {
  expect(createHealth()).toEqual({ lives: BALANCE.maxLives, invulnerableUntil: 0 });
});

test('first hit takes one life and grants invulnerability', () => {
  const r = applyDamage(createHealth(2), 1000);
  expect(r.tookDamage).toBe(true);
  expect(r.died).toBe(false);
  expect(r.health.lives).toBe(1);
  expect(r.health.invulnerableUntil).toBe(6000);
});

test('two damage sources in the same frame take only one life', () => {
  const first = applyDamage(createHealth(2), 1000);
  const second = applyDamage(first.health, 1000);
  expect(second.tookDamage).toBe(false);
  expect(second.health.lives).toBe(1);
});

test('hit during invulnerability is ignored, hit after it kills', () => {
  const first = applyDamage(createHealth(2), 1000);
  expect(applyDamage(first.health, 5999).tookDamage).toBe(false);
  const last = applyDamage(first.health, 1000 + 5001);
  expect(last.tookDamage).toBe(true);
  expect(last.died).toBe(true);
  expect(last.health.lives).toBe(0);
});

test('applyDamage does not mutate the input', () => {
  const h = createHealth(2);
  applyDamage(h, 1000);
  expect(h.lives).toBe(2);
});

import { heal } from '../src/systems/Health.js';

test('heal restores lives up to maxLives and keeps invulnerability', () => {
  const hurt = applyDamage(createHealth(2), 1000).health; // 1 life
  expect(heal(hurt, 1, 2)).toEqual({ lives: 2, invulnerableUntil: hurt.invulnerableUntil });
  expect(heal(createHealth(2), 3, 2).lives).toBe(2);
  expect(heal({ lives: 1, invulnerableUntil: 0 }, 5).lives).toBe(BALANCE.maxLives);
});

test('heal does not mutate input', () => {
  const h = { lives: 1, invulnerableUntil: 0 };
  heal(h, 1);
  expect(h.lives).toBe(1);
});
