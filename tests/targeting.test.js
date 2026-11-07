import { describe, expect, test } from 'vitest';
import { pickNearest } from '../src/systems/Targeting.js';

const from = { x: 0, y: 0 };

test('empty list → null', () => expect(pickNearest(from, [])).toBeNull());

test('inactive targets are ignored', () => {
  const dead = { x: 1, y: 0, active: false };
  const alive = { x: 10, y: 0, active: true };
  expect(pickNearest(from, [dead, alive])).toBe(alive);
});

test('only inactive targets → null', () => {
  expect(pickNearest(from, [{ x: 1, y: 1, active: false }])).toBeNull();
});

test('picks the nearest of three', () => {
  const a = { x: 30, y: 40, active: true }; // 50
  const b = { x: -6, y: 8, active: true }; // 10
  const c = { x: 0, y: 20, active: true }; // 20
  expect(pickNearest(from, [a, b, c])).toBe(b);
});

test('equal distance → first in array', () => {
  const a = { x: 0, y: 5, active: true };
  const b = { x: 5, y: 0, active: true };
  expect(pickNearest(from, [a, b])).toBe(a);
});

import { interceptPoint } from '../src/systems/Targeting.js';

describe('interceptPoint', () => {
  test('stationary target → its own position', () => {
    expect(interceptPoint({ x: 0, y: 0 }, { x: 100, y: 0, vx: 0, vy: 0 }, 100)).toEqual({ x: 100, y: 0 });
  });

  test('moving target → point where projectile and target meet', () => {
    const p = interceptPoint({ x: 0, y: 0 }, { x: 100, y: 0, vx: 0, vy: 50 }, 100);
    const t = Math.sqrt(10000 / 7500);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(50 * t, 6);
    // снаряд долітає туди рівно за той самий час t
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(100 * t, 6);
  });

  test('target faster than projectile running away → falls back to current position', () => {
    expect(interceptPoint({ x: 0, y: 0 }, { x: 100, y: 0, vx: 500, vy: 0 }, 100)).toEqual({ x: 100, y: 0 });
  });
});
