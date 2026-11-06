import { expect, test } from 'vitest';
import { parseCssPx, safeTopGamePx } from '../src/systems/Layout.js';

test('CSS px of the safe-area inset → game px (canvas fills the screen height)', () => {
  // екран 800 css px заввишки показує 1600 ігрових px → 30 css px вирізу = 60 ігрових
  expect(safeTopGamePx(30, 800, 1600)).toBe(60);
});

test('no inset or bad sizes → 0', () => {
  expect(safeTopGamePx(0, 800, 1600)).toBe(0);
  expect(safeTopGamePx(30, 0, 1600)).toBe(0);
  expect(safeTopGamePx(Number.NaN, 800, 1600)).toBe(0);
});

test('parseCssPx reads "24px", " 24.5px ", empty and garbage', () => {
  expect(parseCssPx('24px')).toBe(24);
  expect(parseCssPx(' 24.5px ')).toBe(24.5);
  expect(parseCssPx('')).toBe(0);
  expect(parseCssPx('auto')).toBe(0);
  expect(parseCssPx(undefined)).toBe(0);
});
