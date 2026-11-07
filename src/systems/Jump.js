import { BALANCE } from '../config/balance.js';

/**
 * Стрибок між стінами як чистий стан (без Phaser).
 * k — прогрес від стіни from (0) до стіни to (1); dir = +1 вперед, −1 після розвороту.
 * Утримання: поки holding і holdMs < holdMaxMs, політ подовжується і дуга росте.
 * Розворот: один за стрибок, слизак повертається на from.
 */
export function createJump(fromSide, { holding = false } = {}) {
  return {
    from: fromSide,
    to: fromSide === 'left' ? 'right' : 'left',
    k: 0,
    dir: 1,
    holding,
    holdMs: 0,
    reversed: false,
  };
}

/** Частка повного утримання 0…1. */
export function holdFraction(j) {
  return Math.min(j.holdMs / BALANCE.holdMaxMs, 1);
}

/** Повна тривалість стрибка (мс) з урахуванням утримання; speedMul > 1 — швидший стрибок. */
export function jumpDurationMs(j, speedMul = 1) {
  const f = holdFraction(j);
  return (BALANCE.jumpDurationMs * (1 + (BALANCE.holdDurationMul - 1) * f)) / speedMul;
}

export function jumpArcPx(j) {
  const f = holdFraction(j);
  return BALANCE.jumpArcPx * (1 + (BALANCE.holdArcMul - 1) * f);
}

export function releaseJump(j) {
  return j.holding ? { ...j, holding: false } : j;
}

/** Розворот назад до стіни from. Повертає null, якщо розвертатися вже не можна. */
export function reverseJump(j) {
  if (j.reversed) return null;
  return { ...j, dir: -1, reversed: true, holding: false };
}

/**
 * Крок на dt мс. Повертає { jump, landedSide }: landedSide — стіна, на яку слизак приземлився
 * (тоді jump = null), інакше null.
 */
export function stepJump(j, dt, speedMul = 1) {
  let holdMs = j.holdMs;
  let holding = j.holding;
  if (holding) {
    holdMs = Math.min(holdMs + dt, BALANCE.holdMaxMs);
    if (holdMs >= BALANCE.holdMaxMs) holding = false;
  }
  const next = { ...j, holdMs, holding };
  const k = j.k + (j.dir * dt) / jumpDurationMs(next, speedMul);
  if (k >= 1) return { jump: null, landedSide: j.to };
  if (k <= 0 && j.dir < 0) return { jump: null, landedSide: j.from };
  return { jump: { ...next, k }, landedSide: null };
}

/** Позиція слизака: x — лінійно між стінами, y — дуга вгору від baseY. */
export function jumpPosition(j, fromX, toX, baseY) {
  return { x: fromX + (toX - fromX) * j.k, y: baseY - jumpArcPx(j) * Math.sin(Math.PI * j.k) };
}
