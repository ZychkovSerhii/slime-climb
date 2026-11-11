import { expect, test } from 'vitest';
import { heightPoints, killPoints } from '../src/systems/Score.js';

test('heightPoints floors distance / pxPerPoint', () => expect(heightPoints(95)).toBe(9));
test('killPoints for a regular enemy', () => expect(killPoints('lion')).toBe(50));
test('killPoints for the boss', () => expect(killPoints('boss')).toBe(1000));

test('Коля: очки боса, уламки — 0', async () => {
  const { killPoints } = await import('../src/systems/Score.js');
  const { BALANCE } = await import('../src/config/balance.js');
  expect(killPoints('kolya')).toBe(BALANCE.kolya.points);
  expect(killPoints('kolyaPart')).toBe(0);
});
