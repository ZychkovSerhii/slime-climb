import { BALANCE } from '../config/balance.js';
import { spawnIntervalMs } from './Difficulty.js';

/** Хто з'являється в біомі. Біом 1 (cave) — з BALANCE.enemies.<type>.from; зима й бамбук — з BALANCE.<біом>.from. */
export const BIOME_TYPES = { cave: ['lion', 'bat', 'plant'], winter: ['elf', 'bat', 'penguin'], bamboo: ['lantern', 'bat', 'ninja'] };

/**
 * Стан розкладу: коли (секунда гри) наступна поява кожного типу.
 * biome — 'cave' | 'winter' | 'bamboo'; startSec — секунда гри, коли біом почався (перші появи рахуються від неї).
 */
export function createSpawnState(biome = 'cave', startSec = 0) {
  const nextAt = {};
  for (const t of BIOME_TYPES[biome]) {
    const from = biome === 'cave' ? BALANCE.enemies[t].from : BALANCE[biome].from[t];
    nextAt[t] = startSec + from;
  }
  return { nextAt, biome };
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
  const biome = state.biome ?? 'cave';
  for (const type of Object.keys(nextAt)) {
    const interval = (spawnIntervalMs(type, tSec, biome) / 1000) * intervalMul;
    if (suppressed) {
      nextAt[type] = Math.max(nextAt[type], tSec + interval);
      continue;
    }
    if (tSec >= nextAt[type]) {
      spawn.push(type);
      nextAt[type] = tSec + interval;
    }
  }
  return { state: { nextAt, biome }, spawn };
}
