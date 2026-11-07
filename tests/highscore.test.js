import { expect, test } from 'vitest';
import { loadHighScore, saveHighScore } from '../src/systems/HighScore.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

const throwingStorage = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('denied');
  },
};

test('empty storage → 0', () => expect(loadHighScore(memoryStorage())).toBe(0));

test('saving keeps the best score', () => {
  const s = memoryStorage();
  expect(saveHighScore(s, 50)).toBe(50);
  expect(saveHighScore(s, 30)).toBe(50);
  expect(loadHighScore(s)).toBe(50);
});

test('throwing storage → load 0, save does not throw', () => {
  expect(loadHighScore(throwingStorage)).toBe(0);
  expect(() => saveHighScore(throwingStorage, 10)).not.toThrow();
  expect(saveHighScore(throwingStorage, 10)).toBe(10);
});

test('garbage value → 0', () => {
  expect(loadHighScore(memoryStorage({ 'slime-climb.highScore': 'abc' }))).toBe(0);
});

test('missing storage (undefined) → 0', () => expect(loadHighScore(undefined)).toBe(0));
