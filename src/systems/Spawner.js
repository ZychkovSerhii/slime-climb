import { BALANCE } from '../config/balance.js';
import { spawnIntervalMs } from './Difficulty.js';

const TYPES = ['lion', 'bat', 'plant'];

/** Стан розкладу: коли (секунда гри) наступна поява кожного типу. */
export function createSpawnState() {
  const nextAt = {};
  for (const t of TYPES) nextAt[t] = BALANCE.enemies[t].from;
  return { nextAt };
}

/**
 * Які вороги мають з'явитися на секунді tSec. Не змінює вхідний стан.
 * suppressed (біля боса) — нічого не спавнить і відсуває розклад на один інтервал уперед,
 * тож після боса вороги повертаються поступово, а не пачкою.
 * intervalMul > 1 розтягує інтервали (плавне повернення ворогів після боса).
 */
export function dueSpawns(state, tSec, suppressed, intervalMul = 1) {
  const nextAt = { ...state.nextAt };
  const spawn = [];
  for (const type of TYPES) {
    const interval = (spawnIntervalMs(type, tSec) / 1000) * intervalMul;
    if (suppressed) {
      nextAt[type] = Math.max(nextAt[type], tSec + interval);
      continue;
    }
    if (tSec >= nextAt[type]) {
      spawn.push(type);
      nextAt[type] = tSec + interval;
    }
  }
  return { state: { nextAt }, spawn };
}
