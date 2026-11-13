import { describe, expect, test } from 'vitest';
import { inPauseButton, parseCssPx, pauseButton, safeTopGamePx } from '../src/systems/Layout.js';

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

describe('кнопка паузи (фідбек-6)', () => {
  test('у правому верхньому куті, нижче вирізу камери', () => {
    const b = pauseButton(720, 60);
    expect(b.x).toBe(720 - 24 - 32);
    expect(b.y).toBe(92);
  });
  test('тап у куті — пауза, тап у полі гри — ні', () => {
    expect(inPauseButton(700, 80, 720, 60)).toBe(true);
    expect(inPauseButton(719, 0, 720, 60)).toBe(true); // самий кут, над кнопкою
    expect(inPauseButton(600, 80, 720, 60)).toBe(false);
    expect(inPauseButton(700, 200, 720, 60)).toBe(false);
  });
});
