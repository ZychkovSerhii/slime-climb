import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  afterTrainHp, blastHits, bombFuseMs, bombTargets, candyAngles, createRush, danceBounds, danceTarget, peekDamage,
  phaseFor, rushDueCount, rushHeal, rushOver, trainGone, trainLayout,
} from '../src/systems/ShkodkoPlanner.js';

const S = BALANCE.shkodko;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

describe('фази Шкодька', () => {
  test('пороги 80 / 50 / 30%', () => {
    expect(phaseFor(1)).toBe(1);
    expect(phaseFor(0.8)).toBe(2);
    expect(phaseFor(0.5)).toBe(3);
    expect(phaseFor(0.3)).toBe(4);
  });
  test('не відкочуються після лікування', () => {
    expect(phaseFor(0.65, 3)).toBe(3);
  });
});

describe('танець', () => {
  const b = danceBounds(540, 30, 600);
  test('зона між стінами і над гравцем', () => {
    expect(b.minX).toBe(BALANCE.wallWidth + 30);
    expect(b.maxX).toBe(540 - BALANCE.wallWidth - 30);
    expect(b.maxY).toBe(600 - S.zone.bottomGap);
  });
  test('кожна aimEvery-та точка — на гравця, в межах зони', () => {
    const t = danceTarget(4, 4, { x: 10, y: 700 }, b, Math.random);
    expect(t).toEqual({ x: b.minX, y: 700, aimed: true });
    const r = danceTarget(3, 4, { x: 10, y: 700 }, b, seq(0.5));
    expect(r.aimed).toBe(false);
    expect(r.x).toBeCloseTo((b.minX + b.maxX) / 2);
  });
});

describe('бомби', () => {
  test('цілі в межах коридору', () => {
    for (const t of bombTargets(50, { x: 100, y: 600 }, 80, 460, Math.random)) {
      expect(t.x).toBeGreaterThanOrEqual(80);
      expect(t.x).toBeLessThanOrEqual(460);
      expect(t.y).toBeLessThanOrEqual(600);
    }
  });
  test('запал 2–3 с', () => {
    expect(bombFuseMs(() => 0)).toBe(S.bomb.fuseMinMs);
    expect(bombFuseMs(() => 0.999)).toBeLessThan(S.bomb.fuseMaxMs);
  });
  test('вибух б\'є лише в радіусі', () => {
    expect(blastHits({ x: 0, y: 0 }, { x: S.bomb.radiusPx - 1, y: 0 })).toBe(true);
    expect(blastHits({ x: 0, y: 0 }, { x: S.bomb.radiusPx + 1, y: 0 })).toBe(false);
  });
});

describe('подарунковий дощ', () => {
  const R = S.rush;
  test('рівномірно за durationMs, перший одразу', () => {
    const r = createRush(1000);
    expect(rushDueCount(r, 1000)).toBe(1);
    expect(rushDueCount(r, 1000 + R.durationMs / 2)).toBe(R.count / 2 + 1);
    expect(rushDueCount(r, 1000 + R.durationMs * 2)).toBe(R.count);
  });
  test('кінець — після часу падіння останнього', () => {
    const r = createRush(0);
    expect(rushOver(r, R.durationMs, 2000)).toBe(false);
    expect(rushOver(r, R.durationMs + 2000, 2000)).toBe(true);
  });
  test('ціль виконано — не лікує; ні — 5% за незібраний, не вище 65%', () => {
    expect(rushHeal(40, 100, R.goal)).toBe(40);
    expect(rushHeal(40, 100, 8)).toBe(40);
    expect(rushHeal(40, 100, 5)).toBeCloseTo(40 + 5 * 5);
    expect(rushHeal(40, 100, 0)).toBe(65);
    expect(rushHeal(70, 100, 0)).toBe(70); // ніколи не знижує
  });
});

describe('потяг', () => {
  test('визирання не збиває нижче 15%', () => {
    expect(peekDamage(30, 100, 5)).toBe(25);
    expect(peekDamage(16, 100, 5)).toBe(15);
    expect(peekDamage(15, 100, 5)).toBe(15);
  });
  test('після потяга HP ≤ 15%', () => {
    expect(afterTrainHp(28, 100)).toBe(15);
    expect(afterTrainHp(12, 100)).toBe(12);
    expect(afterTrainHp(0.4, 100)).toBe(1);
  });
  test('розстановка і виїзд', () => {
    const xs = trainLayout(3, 1, 540, 56);
    expect(xs[0]).toBe(-28);
    expect(xs[1]).toBe(-28 - (56 + S.train.wagonGapPx));
    expect(trainGone(xs, 1, 540, 56)).toBe(false);
    expect(trainGone(xs.map((x) => x + 5000), 1, 540, 56)).toBe(true);
    const back = trainLayout(2, -1, 540, 56);
    expect(back[0]).toBe(540 + 28);
    expect(trainGone(back.map((x) => x - 5000), -1, 540, 56)).toBe(true);
  });
  test('інваріант чесності: вагон проїжджає повз слизака швидше, ніж тримає стрибок з утриманням', () => {
    const passMs = ((56 + 48) / S.train.speed) * 1000;
    const holdFlight = BALANCE.jumpDurationMs * BALANCE.holdDurationMul;
    expect(passMs).toBeLessThan(holdFlight * 0.6);
    // між вагонами слизак встигає приземлитися і стрибнути знову
    expect((S.train.wagonGapPx / S.train.speed) * 1000).toBeGreaterThan(holdFlight);
  });
});

test('віяло цукерок симетричне', () => {
  const a = candyAngles(0);
  expect(a.length).toBe(S.candy.count);
  expect(a[0]).toBeCloseTo(-a[a.length - 1]);
});
