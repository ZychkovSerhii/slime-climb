import { BALANCE } from '../config/balance.js';

/** Очки за пройдену висоту. */
export function heightPoints(distancePx) {
  return Math.floor(distancePx / BALANCE.pxPerPoint);
}

/** Очки за вбивство ворога типу type ('boss' — павучиха, 'shkodko' — Шкодько). */
export function killPoints(type) {
  if (type === 'boss') return BALANCE.boss.points;
  if (type === 'shkodko') return BALANCE.shkodko.points;
  return BALANCE.enemies[type]?.points ?? 0;
}
