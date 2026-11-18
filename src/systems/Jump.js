import { BALANCE } from '../config/balance.js';

/**
 * Стрибок між стінами як чистий стан (без Phaser).
 * k — прогрес від стіни from (0) до стіни to (1); dir = +1 вперед, −1 після розвороту.
 * Утримання: поки holding і holdMs < holdMaxMs, політ подовжується і дуга росте.
 * Розворот: один за стрибок, слизак повертається на from.
 */
export function createJump(fromSide, { holding = false, charged = false, startLift = 0 } = {}) {
  return {
    from: fromSide,
    to: fromSide === 'left' ? 'right' : 'left',
    k: 0,
    dir: 1,
    holding,
    holdMs: 0,
    reversed: false,
    // етап 14: заряджений стрибок сідає вище; startLift — на скільки слизак був над baseY на старті (ще сповзав)
    charged,
    startLift,
  };
}

/** Етап 14: на скільки px над baseY сяде заряджений стрибок (росте з утриманням; без заряду — 0). */
export function landingLift(j) {
  return j.charged ? BALANCE.charge.liftPx * holdFraction(j) : 0;
}

/** Чи вмикає цей стрибок кулдаун заряду (утримання не менше minFrac і сів на іншу стіну). */
export function usedCharge(j) {
  return j.charged && !j.reversed && holdFraction(j) >= BALANCE.charge.minFrac;
}

/** Сповзання після зарядженого стрибку: підйом зменшується на liftPx за slideMs. */
export function slideLift(lift, dt) {
  const C = BALANCE.charge;
  return Math.max(lift - (C.liftPx * dt) / C.slideMs, 0);
}

/** Частка готовності заряду 0…1 (1 — готовий): readyAt — коли кулдаун скінчиться. */
export function chargeReadiness(readyAt, nowMs) {
  if (nowMs >= readyAt) return 1;
  return Math.max(1 - (readyAt - nowMs) / BALANCE.charge.cooldownMs, 0);
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
 * Крок на dt мс. Повертає { jump, landedSide, lift, charged }: landedSide — стіна, на яку слизак приземлився
 * (тоді jump = null), інакше null; lift — на скільки px над baseY він сів; charged — чи витрачено заряд.
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
  if (k >= 1) return { jump: null, landedSide: j.to, lift: landingLift(next), charged: usedCharge(next) };
  if (k <= 0 && j.dir < 0) return { jump: null, landedSide: j.from, lift: j.startLift, charged: false };
  return { jump: { ...next, k }, landedSide: null };
}

/**
 * Позиція слизака: x — лінійно між стінами, y — дуга вгору від baseY.
 * Етап 14: висота старту (startLift) плавно переходить у висоту приземлення (landingLift).
 */
export function jumpPosition(j, fromX, toX, baseY) {
  const lift = (j.startLift ?? 0) * (1 - j.k) + landingLift(j) * j.k;
  return { x: fromX + (toX - fromX) * j.k, y: baseY - lift - jumpArcPx(j) * Math.sin(Math.PI * j.k) };
}
