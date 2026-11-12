// Чиста логіка унікальних карток Казана (етап 11, §11.4). Без Phaser. Картки — 'loot:<id>' у progression.relics.
import { BALANCE } from '../config/balance.js';
import { lootShotDamage } from './KolyaLoot.js';

const L = BALANCE.kazanLoot;

export const KAZAN_LOOT_IDS = ['ladle', 'iamkazan'];

/** «Я КАЗАН»: кільце лави замість втрати життя — раз за рівень. state { usedAtLevel } або null. */
export function canBoil(state, level) {
  return !state || state.usedAtLevel !== level;
}

export function useBoil(state, level) {
  return { usedAtLevel: level };
}

/** Шкода краплі «Черпачка»: damage + те, що дали картки «Урон». */
export function ladleDamage(weaponDamage) {
  return lootShotDamage(L.ladle.damage, weaponDamage);
}

/** Кого б'є кільце лави «Я КАЗАН»: цілі в радіусі radiusPx від гравця. */
export function ringVictims(player, targets, radius = L.iam.radiusPx) {
  return targets.filter((t) => Math.hypot(t.x - player.x, t.y - player.y) <= radius);
}
