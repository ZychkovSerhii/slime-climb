import { BALANCE } from '../config/balance.js';
import { tuning } from './Tuning.js';

export function createHealth(maxLives = BALANCE.maxLives) {
  return { lives: maxLives, invulnerableUntil: 0 };
}

/**
 * Одна порція шкоди в момент nowMs (мс часу гри).
 * Під час невразливості нічого не змінює — тож два джерела шкоди в одному кадрі знімають одне життя.
 */
export function applyDamage(h, nowMs, amount = 1) {
  if (nowMs < h.invulnerableUntil || h.lives <= 0) {
    return { health: h, tookDamage: false, died: false };
  }
  // біом 5: тимчасове серце з гнилої плоті знімається першим (одна одиниця шкоди), решта — зі звичайних життів
  const temp = tempHeartOn(h, nowMs);
  const fromLives = temp ? amount - 1 : amount;
  const health = { ...h, lives: h.lives - fromLives, invulnerableUntil: nowMs + BALANCE.invulnerableMs };
  if (temp) health.tempUntil = 0;
  return { health, tookDamage: true, died: health.lives <= 0 };
}

/** Тимчасове серце (гнила плоть, біом 5) ще діє. */
export function tempHeartOn(h, nowMs) {
  return (h.tempUntil ?? 0) > nowMs;
}

/** Дати (або оновити) тимчасове серце на ms: воно одне — нове лише продовжує таймер. */
export function giveTempHeart(h, nowMs, ms) {
  return { ...h, tempUntil: nowMs + ms };
}

/** Частка часу тимчасового серця, що лишилась (0…1; 0 — немає). */
export function tempHeartLeft(h, nowMs, ms) {
  return tempHeartOn(h, nowMs) ? Math.min((h.tempUntil - nowMs) / ms, 1) : 0;
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
