// Біоми (етап 6a): який біом зараз, перехід ворога за край, Санта, подарунки. Чисті функції без Phaser.
import { BALANCE } from '../config/balance.js';

const W = BALANCE.winter;

/**
 * Перехід за край по одній осі. pos — координата центру, [min, max] — межі екрана, margin — запас за краєм.
 * Вилетів за край і переходи ще є → з'являється з протилежного боку (за краєм, щоб не «вистрибнути» посеред екрана).
 * Переходів немає → gone: ворог зникає (інакше екран засмічується, а слабкі телефони гальмують).
 */
export function wrapAxis(pos, min, max, margin, wrapsLeft) {
  if (pos >= min - margin && pos <= max + margin) return { pos, wrapsLeft, wrapped: false, gone: false };
  if (wrapsLeft <= 0) return { pos, wrapsLeft: 0, wrapped: false, gone: true };
  const next = pos < min - margin ? max + margin : min - margin;
  return { pos: next, wrapsLeft: wrapsLeft - 1, wrapped: true, gone: false };
}

/**
 * Санта: раз на 60 с зими кидаємо кубик з шансом chancePerMin. state — { nextCheckAt } (секунди гри).
 * Повертає { state, spawn }.
 */
export function createSantaState(winterStartSec) {
  return { nextCheckAt: winterStartSec + 60 };
}

export function santaDue(state, tSec, rng, suppressed = false) {
  if (tSec < state.nextCheckAt) return { state, spawn: false };
  const next = { nextCheckAt: state.nextCheckAt + 60 };
  if (suppressed) return { state: next, spawn: false };
  return { state: next, spawn: rng() < BALANCE.enemies.santa.chancePerMin };
}

/** Подарунки: { nextAt } у мс гри. Перший — через firstMs від початку зими, далі everyMs ± jitter. */
export function createGiftState(winterStartMs) {
  return { nextAt: winterStartMs + W.gift.firstMs };
}

export function giftDue(state, nowMs, rng, suppressed = false) {
  if (nowMs < state.nextAt) return { state, spawn: false };
  const delay = W.gift.everyMs * (1 - W.gift.jitter + 2 * W.gift.jitter * rng());
  return { state: { nextAt: nowMs + delay }, spawn: !suppressed };
}

/**
 * x подарунка: посередині коридору, де проходить траєкторія стрибка (не біля стін — туди слизак не дотягнеться,
 * поки сидить на стіні, і подарунок лежав би під шипами). laneMin/laneMax — внутрішні краї стін.
 */
export function giftX(rng, laneMin, laneMax) {
  const pad = (laneMax - laneMin) * 0.2;
  return laneMin + pad + rng() * (laneMax - laneMin - 2 * pad);
}

/** HP пінгвіна: випадково в [hp, hpMax]. */
export function penguinHp(rng) {
  const P = BALANCE.enemies.penguin;
  return P.hp + Math.floor(rng() * (P.hpMax - P.hp + 1));
}

/** Розмір групи пінгвінів: 1..groupMax. */
export function penguinGroup(rng) {
  return 1 + Math.floor(rng() * BALANCE.enemies.penguin.groupMax);
}

/** Чи зачіпає ричання ведмедя гравця: відстань між центрами ≤ радіуса. */
export function roarReaches(bear, player, radius = BALANCE.enemies.bear.roarRadiusPx) {
  return Math.hypot(bear.x - player.x, bear.y - player.y) <= radius;
}

/** Скільки досвіду до наступного рівня — Санта дає рівно стільки (тобто рівень). */
export function xpToLevelUp(xp, need) {
  return Math.max(need - xp, 0);
}
