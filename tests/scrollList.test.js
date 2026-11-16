import { expect, test } from 'vitest';
import { clampScroll, isDrag, maxScroll, TAP_SLOP } from '../src/systems/ScrollList.js';
import { BALANCE } from '../src/config/balance.js';

test('усе влазить — прокрутки немає', () => {
  expect(maxScroll(500, 800)).toBe(0);
  expect(clampScroll(300, 500, 800)).toBe(0);
});

test('прокрутка не виходить за межі', () => {
  expect(clampScroll(-50, 3000, 800)).toBe(0);
  expect(clampScroll(5000, 3000, 800)).toBe(2200);
  expect(clampScroll(1000, 3000, 800)).toBe(1000);
  expect(clampScroll(NaN, 3000, 800)).toBe(0);
});

test('тап проти протягування', () => {
  expect(isDrag(100, 100 + TAP_SLOP)).toBe(false);
  expect(isDrag(100, 100 - TAP_SLOP - 1)).toBe(true);
});

test('останнє досягнення досяжне прокруткою', () => {
  const rows = BALANCE.meta.achievements.length;
  const ROW_H = 150, viewH = 800;
  const last = clampScroll(1e9, rows * ROW_H, viewH);
  expect(rows * ROW_H - last).toBeLessThanOrEqual(viewH);
});
