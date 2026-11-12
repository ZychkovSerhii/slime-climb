import { BALANCE } from '../config/balance.js';

/** Очки за пройдену висоту. */
export function heightPoints(distancePx) {
  return Math.floor(distancePx / BALANCE.pxPerPoint);
}

/** Очки за вбивство ворога типу type ('boss' — павучиха, 'shkodko' — Шкодько, 'kolya' — Коля; уламки 'kolyaPart' — 0). */
export function killPoints(type) {
  if (type === 'boss') return BALANCE.boss.points;
  if (type === 'shkodko') return BALANCE.shkodko.points;
  if (type === 'kolya') return BALANCE.kolya.points;
  if (type === 'bear') return BALANCE.bearBoss.points;
  if (type === 'kazan') return BALANCE.kazan.points;
  return BALANCE.enemies[type]?.points ?? 0;
}
