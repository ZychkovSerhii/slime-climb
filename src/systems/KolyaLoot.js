// Чиста логіка унікальних карток Колі (етап 9, §9.4) і бонусу Шагів за боса без трофеїв (§0). Без Phaser.
import { BALANCE } from '../config/balance.js';

export const KOLYA_LOOT_IDS = ['larva', 'iamkolya'];

/** «Я КОЛЯ»: поділ замість втрати життя — раз за рівень. state { usedAtLevel } або null. */
export function canSplit(state, level) {
  return !state || state.usedAtLevel !== level;
}

export function useSplit(state, level) {
  return { usedAtLevel: level };
}

/** Шкода плювка личинки / пострілу мінікопії: база + те, що дали картки «Урон». */
export function lootShotDamage(base, weaponDamage) {
  return base + (weaponDamage - BALANCE.projectileDamage);
}

/**
 * §0: усі унікальні картки боса вже взяті (offered порожній) — бос дає ще lootStepsBonus від своїх Шагів.
 * Повертає скільки Шагів додати.
 */
export function lootStepsBonus(bossSteps, offered) {
  return offered.length ? 0 : Math.round(bossSteps * BALANCE.lootStepsBonus);
}
