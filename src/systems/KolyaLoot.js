// Чиста логіка унікальних карток Колі (етап 9, §9.4) і бонусу Шагів за боса без трофеїв (§0). Без Phaser.
import { BALANCE } from '../config/balance.js';

export const KOLYA_LOOT_IDS = ['larva', 'iamkolya'];

/** Шкода плювка личинки: база + те, що дали картки «Урон». (Фідбек-8: поділ «Я КОЛЯ» замінено кнопкою клонів.) */
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
