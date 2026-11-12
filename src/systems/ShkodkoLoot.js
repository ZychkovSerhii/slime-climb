import { BALANCE } from '../config/balance.js';
import { availableCards, CARD_IDS } from './Progression.js';

// Чиста логіка унікальних карток Шкодька (етап 6c). Без Phaser.
// Картки — ті самі 'loot:<id>', що в павучихи, і лежать у progression.relics.

const K = BALANCE.shkodkoLoot;

export const SHKODKO_LOOT_IDS = ['sack', 'iam'];

/** Трансформації: діє остання взята ('form' — павук, 'iam' — Шкодько, 'iamkolya' — Коля, етап 9) або null. */
export const FORM_IDS = ['form', 'iam', 'iamkolya'];
export function activeForm(relics) {
  for (let i = relics.length - 1; i >= 0; i--) if (FORM_IDS.includes(relics[i])) return relics[i];
  return null;
}

/** Скін трансформації або null (тоді — куплений скін). */
export function formSkin(relics) {
  const f = activeForm(relics);
  return { form: 'slimeSpider', iam: 'slimeShkodko', iamkolya: 'slimeKolya' }[f] ?? null;
}

/**
 * Скільки разів спрацював таймер на кроці: state { nextAt } (null — ще не стартував).
 * Перший раз — через everyMs від старту. Повертає { state, count }.
 */
export function stepTicker(state, nowMs, everyMs) {
  if (!state) return { state: { nextAt: nowMs + everyMs }, count: 0 };
  let { nextAt } = state;
  let count = 0;
  while (nowMs >= nextAt) {
    nextAt += everyMs;
    count += 1;
  }
  return { state: count ? { nextAt } : state, count };
}

/** Що випало з мішка: 'bombs' | 'xp' | 'steps' | 'skill' (за вагами K.sack.weights). */
export function rollSack(rng, weights = K.sack.weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [id, w] of entries) {
    if (r < w) return id;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

/** Картка-навичка для прокачки з мішка: вже взята, не зброя, ще не на максимумі. null — нема. */
export function sackSkillCard(p, rng) {
  const open = availableCards(p);
  const pool = CARD_IDS.filter((id) => (p.picks[id] ?? 0) > 0 && open.includes(id));
  if (!pool.length) return null;
  return pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)];
}

/** До n різних найближчих до гравця цілей для своїх бомб (targets — [{x, y}]). */
export function bombTargets(player, targets, n) {
  const d = (t) => Math.hypot(t.x - player.x, t.y - player.y);
  return [...targets].sort((a, b) => d(a) - d(b)).slice(0, n);
}

/** Шкода своєї бомби: база + те, що дали картки «Урон». */
export function friendlyBombDamage(weaponDamage) {
  return K.bomb.damage + (weaponDamage - BALANCE.projectileDamage);
}

/** Хто з цілей у радіусі вибуху. */
export function blastVictims(bomb, targets, radius = K.bomb.radiusPx) {
  return targets.filter((t) => Math.hypot(t.x - bomb.x, t.y - bomb.y) <= radius);
}
