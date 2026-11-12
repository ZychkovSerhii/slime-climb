// Ходоки по стінах (фідбек-3): білий ведмідь і пінгвіни. Чисті функції без Phaser.
//
// Інваріант «безпечна стіна»: поки ходок іде стіною A, на стіні B немає шипів там, де гравець може
// зустрітися з ходоком (з запасом на реакцію). Тоді від ходока завжди можна сховатися на B.
//
// Координати «світу»: c = distancePx − y (y — центр на екрані). Шипи нерухомі у світі, гравець піднімається
// у світі зі швидкістю прокрутки s. Ходок рухається у світі зі швидкістю v (+ — угору): ведмідь лізе вгору
// (v ∈ [0, climb]), пінгвін ковзає вниз (v ∈ [−slide, 0]). Сповільнення гравцем (крига, павутина), ричання
// і поступ кола лише змінюють v у цих межах — тож місце зустрічі завжди в інтервалі meetInterval.
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

/**
 * Межі швидкості ходока у світі (px/s, + — угору). loopSpeed — множник кола (≥ 1).
 * Повертає { vMin, vMax }.
 */
export function walkerSpeedRange(type, loopSpeed = 1) {
  const E = BALANCE.enemies;
  if (type === 'bear') return { vMin: 0, vMax: E.bear.climbSpeed * loopSpeed };
  if (type === 'penguin') return { vMin: -E.penguin.slideSpeed * loopSpeed, vMax: 0 };
  throw new Error(`not a wall walker: ${type}`);
}

/**
 * Інтервал світу [from, to], де ходок може зустріти гравця (центри), з запасом.
 * w0 — світова координата голови ходока зараз, tail — довжина «хвоста» вгору (група пінгвінів),
 * halfLen — половина довжини одного ходока, d0 — distancePx зараз, zoneY — y гравця на екрані,
 * scroll — прокрутка (px/s). Прокрутка з часом лише росте, тож поточна — найгірший випадок.
 */
export function meetInterval({ w0, tail = 0, halfLen, d0, zoneY, scroll, vMin, vMax }) {
  if (vMax >= scroll) throw new Error('walker must be slower than the scroll: player has to catch it');
  // гравець у світі: d(t) − zoneY = d0 + s·t − zoneY; ходок: w + v·t → зустріч w + v·(w − d0 + zoneY)/(s − v)
  const meet = (w, v) => w + (v * (w - d0 + zoneY)) / (scroll - v);
  const points = [w0, w0 + tail].flatMap((w) => [meet(w, vMin), meet(w, vMax)]);
  const margin = halfLen + BALANCE.playerSize / 2 + spikeBand(scroll);
  return { from: Math.min(...points) - margin, to: Math.max(...points) + margin };
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
