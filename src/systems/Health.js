import { BALANCE } from '../config/balance.js';
import { tuning } from './Tuning.js';

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

/**
 * Скільки життів повертає перехід з рівня fromLevel на toLevel (етап 10, §10.5):
 * рівні до healLateFrom включно — по healPerLevel; далі — лише парні.
 * mode — режим налаштувань: 'game' (як вище), 'every' (кожен рівень), 'even' (лише парні), 'none'.
 */
export function healForLevels(fromLevel, toLevel, mode = tuning().heal) {
  if (mode === 'none') return 0;
  const heals = (l) => (mode === 'every' ? true : mode === 'even' ? l % 2 === 0 : l <= BALANCE.healLateFrom || l % 2 === 0);
  let n = 0;
  for (let l = fromLevel + 1; l <= toLevel; l++) if (heals(l)) n += BALANCE.healPerLevel;
  return n;
}
