import { BALANCE } from '../config/balance.js';

/** Тимчасові стани слизака (час — мс гри). Поки що лише отруєння від павучків рою. */
export function createStatus() {
  return { poisonUntil: 0 };
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
  return isPoisoned(s, nowMs) ? BALANCE.boss.poison.speedMul : 1;
}
