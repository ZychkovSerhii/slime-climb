import { expect, test } from 'vitest';
import { formatTime } from '../src/systems/Format.js';

test('formats seconds as mm:ss', () => {
  expect(formatTime(0)).toBe('00:00');
  expect(formatTime(59.9)).toBe('00:59');
  expect(formatTime(125)).toBe('02:05');
  expect(formatTime(6000)).toBe('100:00');
});
