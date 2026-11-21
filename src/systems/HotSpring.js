// Гаряче джерело (фідбек-9): будівля на стіні, дотик лікує до повного. Розклад без Phaser.
// Правила користувача: таймер — після смерті павучихи; щохвилини шанс chance (10%), кожна хвилина без появи +5%,
// після появи — знову 10%. Рішення користувача: не під час бою з босом. Рішення Claude: шанс скидається вже на появі
// (а не на використанні — пропущене джерело теж скидає, інакше шанс ріс би, поки гравець не встиг доторкнутись);
// хвилина під час бою/тиші не рахується (кидок переноситься на кінець бою).
import { BALANCE } from '../config/balance.js';

const H = BALANCE.hotSpring;

/** Стан: startedAt — секунда смерті першої павучихи (null — ще жива), nextAt — наступний кидок, chance — поточний шанс. */
export function createSpringState() {
  return { startedAt: null, nextAt: Infinity, chance: H.chance };
}

/**
 * Крок розкладу на секунді tSec. spiderDead — павучиху вже вбито хоч раз; blocked — бій з босом чи підготовка/тиша.
 * Повертає { state, spawn }.
 */
export function springDue(state, { tSec, spiderDead, blocked }, rng) {
  if (state.startedAt === null) {
    if (!spiderDead) return { state, spawn: false };
    return { state: { ...state, startedAt: tSec, nextAt: tSec + H.everySec }, spawn: false };
  }
  if (tSec < state.nextAt) return { state, spawn: false };
  if (blocked) return { state: { ...state, nextAt: tSec + H.retrySec }, spawn: false };
  if (rng() < state.chance) return { state: { ...state, nextAt: tSec + H.everySec, chance: H.chance }, spawn: true };
  return { state: { ...state, nextAt: tSec + H.everySec, chance: Math.min(state.chance + H.chanceStep, 1) }, spawn: false };
}

/** Що дає дотик: життя до максимуму. used — уже використане; повертає null, якщо нічого (повні життя або вже випите). */
export function springHeal(lives, maxLives, used) {
  if (used || lives >= maxLives) return null;
  return maxLives - lives;
}
