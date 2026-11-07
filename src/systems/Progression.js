import { BALANCE } from '../config/balance.js';

export const CARD_IDS = ['attackSpeed', 'damage', 'slow'];

/** Скільки досвіду треба, щоб з рівня level перейти на наступний. */
export function xpToNext(level) {
  return Math.round(BALANCE.xpBase * BALANCE.xpGrowth ** (level - 1));
}

export function createProgression() {
  return {
    level: 1,
    xp: 0,
    weapon: { fireIntervalMs: BALANCE.fireIntervalMs, damage: BALANCE.projectileDamage, slow: null },
    picks: {},
  };
}

/** Додає досвід; надлишок переходить на наступні рівні. Не змінює вхід. */
export function addXp(p, amount) {
  let { level, xp } = p;
  xp += amount;
  let levelsGained = 0;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    levelsGained += 1;
  }
  return { progression: { ...p, level, xp }, levelsGained };
}

export function availableCards(p) {
  return CARD_IDS.filter((id) => !(id === 'attackSpeed' && p.weapon.fireIntervalMs <= BALANCE.minFireIntervalMs));
}

/** n різних випадкових карток з доступних (rng повертає [0, 1)). */
export function rollCards(p, rng, n = 3) {
  const pool = availableCards(p);
  const out = [];
  while (out.length < n && pool.length) {
    const i = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Застосовує картку до зброї. Не змінює вхід. */
export function applyCard(p, id) {
  const w = { ...p.weapon };
  const c = BALANCE.cards;
  if (id === 'attackSpeed') {
    w.fireIntervalMs = Math.max(Math.round(w.fireIntervalMs * c.attackSpeedFactor), BALANCE.minFireIntervalMs);
  } else if (id === 'damage') {
    w.damage += 1;
  } else if (id === 'slow') {
    w.slow = w.slow
      ? { ...w.slow, durationMs: w.slow.durationMs + c.slowStepMs }
      : { factor: c.slowFactor, durationMs: c.slowBaseMs };
  }
  return { ...p, weapon: w, picks: { ...p.picks, [id]: (p.picks[id] ?? 0) + 1 } };
}

/** Досвід за вбивство ворога типу type ('boss' — бос). */
export function killXp(type) {
  if (type === 'boss') return BALANCE.boss.xp;
  return BALANCE.enemies[type]?.xp ?? 0;
}
