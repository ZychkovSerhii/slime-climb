import { BALANCE } from '../config/balance.js';

/** Очки за пройдену висоту. */
export function heightPoints(distancePx) {
  return Math.floor(distancePx / BALANCE.pxPerPoint);
}

/** Очки за вбивство ворога типу type ('boss' — бос). */
export function killPoints(type) {
  if (type === 'boss') return BALANCE.boss.points;
  return BALANCE.enemies[type]?.points ?? 0;
}
