import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  createJump,
  jumpArcPx,
  jumpDurationMs,
  jumpPosition,
  chargeReadiness,
  landingLift,
  releaseJump,
  reverseJump,
  slideLift,
  stepJump,
} from '../src/systems/Jump.js';

/** Проганяє стрибок кроками по 1 мс; release — коли відпустити палець (мс), reverseAt — коли тапнути вдруге. */
function run(j, { releaseAt = Infinity, reverseAt = Infinity, speedMul = 1 } = {}) {
  let t = 0;
  let maxArc = 0;
  for (;;) {
    if (t === releaseAt) j = releaseJump(j);
    if (t === reverseAt) j = reverseJump(j) ?? j;
    const r = stepJump(j, 1, speedMul);
    t += 1;
    if (r.landedSide) return { t, side: r.landedSide, maxArc };
    j = r.jump;
    maxArc = Math.max(maxArc, BALANCE.playerYRatio * 1280 - jumpPosition(j, 0, 100, BALANCE.playerYRatio * 1280).y);
  }
}

describe('jump', () => {
  test('tap: lands on the other wall after jumpDurationMs', () => {
    const r = run(createJump('left'));
    expect(r.side).toBe('right');
    expect(Math.abs(r.t - BALANCE.jumpDurationMs)).toBeLessThanOrEqual(1);
    expect(r.maxArc).toBeCloseTo(BALANCE.jumpArcPx, 0);
  });

  test('full hold: longer and higher jump', () => {
    const r = run(createJump('left', { holding: true }));
    expect(r.side).toBe('right');
    expect(r.t).toBeGreaterThan(BALANCE.jumpDurationMs * 1.3);
    expect(r.t).toBeLessThan(BALANCE.jumpDurationMs * BALANCE.holdDurationMul + 2);
    expect(r.maxArc).toBeGreaterThan(BALANCE.jumpArcPx * 1.8);
  });

  test('short hold gives something between tap and full hold', () => {
    const tap = run(createJump('left')).t;
    const full = run(createJump('left', { holding: true })).t;
    const half = run(createJump('left', { holding: true }), { releaseAt: BALANCE.holdMaxMs / 2 }).t;
    expect(half).toBeGreaterThan(tap);
    expect(half).toBeLessThan(full);
  });

  test('duration and arc never exceed the full-hold caps', () => {
    const j = { ...createJump('left', { holding: true }), holdMs: 99999 };
    expect(jumpDurationMs(j)).toBeCloseTo(BALANCE.jumpDurationMs * BALANCE.holdDurationMul, 6);
    expect(jumpArcPx(j)).toBeCloseTo(BALANCE.jumpArcPx * BALANCE.holdArcMul, 6);
  });

  test('second tap mid-air returns to the starting wall', () => {
    const r = run(createJump('left'), { reverseAt: 100 });
    expect(r.side).toBe('left');
    // повернення займає приблизно стільки ж, скільки встигли пролетіти
    expect(r.t).toBeGreaterThan(190);
    expect(r.t).toBeLessThan(215);
  });

  test('only one reversal per jump', () => {
    const j = reverseJump(createJump('right'));
    expect(j.dir).toBe(-1);
    expect(reverseJump(j)).toBeNull();
  });

  test('speedMul > 1 makes the jump faster', () => {
    expect(run(createJump('left'), { speedMul: 2 }).t).toBeLessThan(BALANCE.jumpDurationMs / 2 + 2);
  });

  test('does not mutate the input', () => {
    const j = createJump('left', { holding: true });
    stepJump(j, 50);
    expect(j.k).toBe(0);
    expect(j.holdMs).toBe(0);
  });
});

/** Проганяє стрибок до приземлення; повертає результат stepJump у момент приземлення. */
function land(j, { releaseAt = Infinity, reverseAt = Infinity } = {}) {
  for (let t = 0; ; t++) {
    if (t === releaseAt) j = releaseJump(j);
    if (t === reverseAt) j = reverseJump(j) ?? j;
    const r = stepJump(j, 1);
    if (r.landedSide) return r;
    j = r.jump;
  }
}

describe('заряджений стрибок (етап 14)', () => {
  const C = BALANCE.charge;
  test('баг: утримання без заряду сідає на ту саму висоту (як раніше)', () => {
    const r = land(createJump('left', { holding: true }));
    expect(r.lift).toBe(0);
    expect(r.charged).toBe(false);
  });
  test('повне утримання із зарядом сідає на крок вище й витрачає заряд', () => {
    const r = land(createJump('left', { holding: true, charged: true }));
    expect(r.landedSide).toBe('right');
    expect(r.lift).toBeCloseTo(C.liftPx, 6);
    expect(r.charged).toBe(true);
  });
  test('крок — це висота шипа: вище за шип, але не більше двох', () => {
    expect(C.liftPx).toBeGreaterThanOrEqual(BALANCE.spikeHeight);
    expect(C.liftPx).toBeLessThanOrEqual(BALANCE.spikeHeight * 2);
  });
  test('короткий дотик із зарядом майже не піднімає й заряду не витрачає', () => {
    const r = land(createJump('left', { holding: true, charged: true }), { releaseAt: 20 });
    expect(r.lift).toBeLessThan(C.liftPx * C.minFrac);
    expect(r.charged).toBe(false);
  });
  test('розворот повертає на висоту старту й заряду не витрачає', () => {
    const r = land(createJump('left', { holding: true, charged: true, startLift: 12 }), { reverseAt: 100 });
    expect(r.landedSide).toBe('left');
    expect(r.lift).toBe(12);
    expect(r.charged).toBe(false);
  });
  test('позиція: старт з поточного підйому, кінець — на підйомі приземлення, без стрибків висоти', () => {
    const base = 900;
    const j = { ...createJump('left', { charged: true, startLift: 20 }), holdMs: BALANCE.holdMaxMs };
    expect(jumpPosition({ ...j, k: 0 }, 0, 100, base).y).toBeCloseTo(base - 20, 6);
    expect(jumpPosition({ ...j, k: 1 }, 0, 100, base).y).toBeCloseTo(base - landingLift(j), 4);
  });
  test('сповзає на місце за slideMs і не нижче baseY', () => {
    expect(slideLift(C.liftPx, C.slideMs / 2)).toBeCloseTo(C.liftPx / 2, 6);
    expect(slideLift(C.liftPx, C.slideMs * 2)).toBe(0);
  });
  test('сповзання повільніше за прокрутку світу: шип, через який перескочив, тікає вниз швидше', () => {
    expect((C.liftPx / C.slideMs) * 1000).toBeLessThan(BALANCE.scrollBase);
  });
  test('готовність заряду: 0 одразу після стрибка, 1 — після кулдауну', () => {
    expect(chargeReadiness(C.cooldownMs, 0)).toBe(0);
    expect(chargeReadiness(C.cooldownMs, C.cooldownMs / 2)).toBeCloseTo(0.5, 6);
    expect(chargeReadiness(C.cooldownMs, C.cooldownMs)).toBe(1);
  });
});
