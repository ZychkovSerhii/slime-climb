import { BALANCE } from '../config/balance.js';

export function createHealth(maxLives = BALANCE.maxLives) {
  return { lives: maxLives, invulnerableUntil: 0 };
}

/**
 * Одна порція шкоди в момент nowMs (мс часу гри).
 * Під час невразливості нічого не змінює — тож два джерела шкоди в одному кадрі знімають одне життя.
 */
export function applyDamage(h, nowMs) {
  if (nowMs < h.invulnerableUntil || h.lives <= 0) {
    return { health: h, tookDamage: false, died: false };
  }
  const health = { lives: h.lives - 1, invulnerableUntil: nowMs + BALANCE.invulnerableMs };
  return { health, tookDamage: true, died: health.lives <= 0 };
}

/** Відновлює amount життів, але не більше maxLives. Не змінює вхід. */
export function heal(h, amount, maxLives = BALANCE.maxLives) {
  return { ...h, lives: Math.min(h.lives + amount, maxLives) };
}
