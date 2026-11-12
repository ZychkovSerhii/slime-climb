import { BALANCE } from '../config/balance.js';
import { tuning } from './Tuning.js';

/** Швидкість прокрутки світу (px/s) на секунді гри tSec. */
export function scrollSpeed(tSec, bossActive) {
  const base = Math.min(BALANCE.scrollBase + BALANCE.scrollGrowth * tSec, BALANCE.maxScrollSpeed);
  return bossActive ? base * BALANCE.bossScrollFactor : base;
}

/**
 * Інтервал між появами ворога типу type (мс): лінійно від базового до base*spawnMinFactor за spawnRampSec.
 * biome 'winter' / 'bamboo' — бази з BALANCE.<біом>.spawnBaseMs.
 */
export function spawnIntervalMs(type, tSec, biome = 'cave') {
  const base = biome === 'cave' ? BALANCE.spawnBaseMs[type] : BALANCE[biome].spawnBaseMs[type];
  const k = Math.min(Math.max(tSec, 0) / BALANCE.spawnRampSec, 1);
  // режим налаштувань: «кількість ворогів» ×2 — інтервал удвічі коротший
  return (base * (1 - (1 - BALANCE.spawnMinFactor) * k)) / tuning().spawn;
}
