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

import { recordResult } from '../src/systems/HighScore.js';

test('recordResult: beating the old record is a new record', () => {
  const s = memoryStorage({ 'slime-climb.highScore': '100' });
  expect(recordResult(s, 150)).toEqual({ best: 150, isNewRecord: true });
});

test('recordResult: equal to the old record is NOT a new record', () => {
  const s = memoryStorage({ 'slime-climb.highScore': '100' });
  expect(recordResult(s, 100)).toEqual({ best: 100, isNewRecord: false });
});

test('recordResult: broken storage never claims a new record', () => {
  expect(recordResult(throwingStorage, 500).isNewRecord).toBe(false);
});

test('recordResult: zero score is not a record on a fresh install', () => {
  expect(recordResult(memoryStorage(), 0).isNewRecord).toBe(false);
});
