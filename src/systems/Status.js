import { BALANCE } from '../config/balance.js';

/** Тимчасові стани слизака (час — мс гри): отруєння від павучків рою, приголомшення ричанням ведмедя. */
export function createStatus() {
  return { poisonUntil: 0, roarUntil: 0 };
}

/** Ричання ведмедя: на roar.durationMs стрибок і стрільба повільніші. Повторне — оновлює таймер, не стакується. */
export function roar(s, nowMs) {
  return { ...s, roarUntil: nowMs + BALANCE.enemies.bear.roar.durationMs };
}

export function isRoared(s, nowMs) {
  return nowMs < (s.roarUntil ?? 0);
}

/** Множник інтервалу пострілу (1 — звичайний): під ричанням стрільба на 30% рідша. */
export function fireIntervalMul(s, nowMs) {
  return isRoared(s, nowMs) ? 1 / BALANCE.enemies.bear.roar.fireMul : 1;
}

/** Отруєння на poison.durationMs від nowMs; повторне — оновлює таймер, сповільнення не стакується. */
export function poison(s, nowMs) {
  return { ...s, poisonUntil: nowMs + BALANCE.boss.poison.durationMs };
}

export function isPoisoned(s, nowMs) {
  return nowMs < s.poisonUntil;
}

/** Множник швидкості стрибка (1 — звичайна). */
export function playerSpeedMul(s, nowMs) {
  const p = isPoisoned(s, nowMs) ? BALANCE.boss.poison.speedMul : 1;
  return p * (isRoared(s, nowMs) ? BALANCE.enemies.bear.roar.speedMul : 1);
}
