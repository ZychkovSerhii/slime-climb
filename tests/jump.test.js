import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  createJump,
  jumpArcPx,
  jumpDurationMs,
  jumpPosition,
  releaseJump,
  reverseJump,
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
