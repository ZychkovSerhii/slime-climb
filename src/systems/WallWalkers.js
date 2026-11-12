// Стіни і «безпечна стіна» (фідбек-3, етап 9). Чисті функції без Phaser.
// Етап 10: ведмідь (тепер міні-бос) і пінгвіни (знову летять діагоналлю) більше не ходять по стінах —
// лишився ніндзя: на його стіні біля гравця немає кілків, поки летить сюрикен.
//
// Координати «світу»: c = distancePx − y (y — центр на екрані). Шипи нерухомі у світі, гравець піднімається
// у світі зі швидкістю прокрутки s.
import { BALANCE } from '../config/balance.js';
import { spikeBand } from './SpikePlanner.js';

export const otherSide = (side) => (side === 'left' ? 'right' : 'left');

/**
 * Стіна для нового ходока: усі ходоки на одній стіні (інакше обидві стіни зайняті).
 * occupied — стіна вже активних чи очікуваних ходоків або null; інакше — стіна, де гравця немає.
 */
export function walkerSide(playerSide, occupied = null) {
  return occupied ?? otherSide(playerSide);
}

/** Світова координата центру об'єкта на екрані. */
export const worldOf = (distancePx, y) => distancePx - y;

/**
 * Чи вже поставлені шипи (spikes: [{ side, y }], центри на екрані) заважають інтервалу на стіні side.
 * Шип займає світ [c − S/2, c + S/2].
 */
export function spikesBlock(spikes, side, interval, distancePx) {
  const half = BALANCE.spikeHeight / 2;
  return spikes.some((s) => {
    if (s.side !== side) return false;
    const c = worldOf(distancePx, s.y);
    return c + half >= interval.from && c - half <= interval.to;
  });
}

/**
 * Ніндзя (етап 9) [рішення плану]: тримається за стіну у верхній частині екрана, тож сам гравця не зустріне.
 * Від його сюрикена ухиляються стрибком на стіну ніндзі — там має бути вільно, коли сюрикен підлітає.
 * Повертає світовий відрізок, який гравець пройде між fromSec і toSec від зараз (з запасом, як у ходоків):
 * на стіні ніндзі в ньому не має бути шипів. d0 — distancePx зараз, zoneY — y гравця на екрані,
 * scroll — прокрутка (px/s; поточна — найгірший випадок, бо прокрутка лише росте).
 */
export function ninjaInterval({ d0, zoneY, scroll, fromSec, toSec }) {
  const margin = BALANCE.playerSize / 2 + spikeBand(scroll);
  return { from: d0 + scroll * fromSec - zoneY - margin, to: d0 + scroll * toSec - zoneY + margin };
}
