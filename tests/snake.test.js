import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  addLeg, createPath, createSnake, divesClear, extendPath, pathLength, pointAt, snakeLayout, upcomingDive,
} from '../src/systems/Snake.js';

const T = BALANCE.shkodko.train;
const W = 720;
const PLAYER_Y = 1280 * BALANCE.playerYRatio;
const CAR_W = 72 * T.carScale;
const CAR_H = 40 * T.carScale;

describe('шлях', () => {
  test('довжина й точка посередині', () => {
    const p = createPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }]);
    expect(pathLength(p)).toBe(150);
    expect(pointAt(p, 50)).toMatchObject({ x: 50, y: 0, angle: 0 });
    expect(pointAt(p, 125)).toMatchObject({ x: 100, y: 25 });
    expect(pointAt(p, 125).angle).toBeCloseTo(Math.PI / 2);
    expect(pointAt(p, -10)).toMatchObject({ x: 0, y: 0 });
    expect(pointAt(p, 999)).toMatchObject({ x: 100, y: 50 });
  });
  test('extendPath не змінює вхід', () => {
    const p = createPath([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    const q = extendPath(p, [{ x: 10, y: 10 }]);
    expect(pathLength(p)).toBe(10);
    expect(pathLength(q)).toBe(20);
  });
});

describe('змійка (фідбек-6 п.18)', () => {
  const L = snakeLayout(W, PLAYER_Y, CAR_W, CAR_H);

  test('ряди не чіпають слизака навіть на найвищому стрибку', () => {
    const peak = BALANCE.jumpArcPx * BALANCE.holdArcMul;
    const lowest = Math.max(...L.rows);
    // тіло вагона квадратне зі стороною CAR_H (Train.Car.spawned); слизак ~48 px заввишки
    expect(lowest + CAR_H / 2).toBeLessThan(PLAYER_Y - peak - 24);
    expect(L.rows.length).toBeGreaterThanOrEqual(2);
  });
  test('ряди від стіни до стіни, повороти відбиваються від верхнього й нижнього', () => {
    let s = createSnake(L, 16, CAR_W);
    const seen = [];
    for (let i = 0; i < 10; i++) {
      s = addLeg(s, L, false);
      seen.push(s.row);
    }
    expect(Math.max(...seen)).toBe(L.rows.length - 1);
    expect(Math.min(...seen)).toBe(0);
    for (const pt of s.path.points.slice(1)) expect(pt.y).toBeLessThan(PLAYER_Y - 200);
  });
  test('пірнання спускається до висоти гравця біля стіни й повертається вгору', () => {
    let s = createSnake(L, 16, CAR_W);
    s = addLeg(s, L, true);
    const d = s.dives[0];
    expect(d.side).toBe('right');
    const bottom = pointAt(s.path, d.bottomD);
    expect(bottom.y).toBe(PLAYER_Y);
    expect(bottom.x).toBe(L.xEnd('right'));
    expect(pointAt(s.path, d.endD).y).toBeLessThan(PLAYER_Y - 200);
  });
  test('нове пірнання — лише коли хвіст попереднього піднявся', () => {
    const len = 16 * CAR_W;
    const dives = [{ side: 'left', startD: 1000, bottomD: 1600, endD: 2200 }];
    expect(divesClear([], 0, len)).toBe(true);
    expect(divesClear(dives, 2200 + len, len)).toBe(false);
    expect(divesClear(dives, 2200 + len + T.snake.diveClearPx + 1, len)).toBe(true);
  });
  test('попередження за warnPx до пірнання, до того як паровоз дійде вниз', () => {
    const dives = [{ side: 'left', startD: 1000, bottomD: 1600, endD: 2200 }];
    expect(upcomingDive(dives, 1000 - T.snake.warnPx - 1)).toBeNull();
    expect(upcomingDive(dives, 900)).toBe(dives[0]);
    expect(upcomingDive(dives, 1700)).toBeNull();
  });
});
