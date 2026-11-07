import { expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { createStatus, isPoisoned, playerSpeedMul, poison } from '../src/systems/Status.js';

const P = BALANCE.boss.poison;

test('poison: 10 s, slime 15% slower, then back to normal', () => {
  const s = poison(createStatus(), 1000);
  expect(isPoisoned(s, 1000)).toBe(true);
  expect(playerSpeedMul(s, 1000)).toBeCloseTo(P.speedMul, 9);
  expect(isPoisoned(s, 1000 + P.durationMs - 1)).toBe(true);
  expect(isPoisoned(s, 1000 + P.durationMs)).toBe(false);
  expect(playerSpeedMul(s, 1000 + P.durationMs)).toBe(1);
});

test('poison again refreshes the timer, does not stack the slowdown', () => {
  const s = poison(poison(createStatus(), 0), 5000);
  expect(isPoisoned(s, 5000 + P.durationMs - 1)).toBe(true);
  expect(playerSpeedMul(s, 6000)).toBeCloseTo(P.speedMul, 9);
});

test('poison does not mutate the input', () => {
  const s = createStatus();
  poison(s, 0);
  expect(isPoisoned(s, 0)).toBe(false);
});
