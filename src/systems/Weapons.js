import { BALANCE } from '../config/balance.js';

// Чиста логіка атак основної зброї (етап 4a). main — id зброї з BALANCE.weapons або null (стартовий постріл).

const U = BALANCE.weaponUpgrades;

/**
 * Шкода одного удару: поточна шкода пострілу (база + «Урон») × множник зброї
 * + damageAdd за кожну прокачку основної зброї (фідбек-2).
 */
export function attackDamage(main, baseDamage, upgrades = 0) {
  const add = main ? U.damageAdd * upgrades : 0;
  return baseDamage * (BALANCE.weapons[main]?.damageMul ?? 1) + add;
}

/** Множник швидкості стрибка від зброї (Ворота чакри — швидші стрибки). */
export function weaponJumpMul(main) {
  return BALANCE.weapons[main]?.jumpSpeedMul ?? 1;
}

/** Радіус розмаху сокири для ширини екрана width. */
export function axeRadius(width, upgrades = 0) {
  return width * BALANCE.weapons.axe.radiusFrac * U.axe.radiusStep ** upgrades;
}

/** Чи з'явилась міні-сокира-помічниця (прокачка сокири до miniAxeAt). */
export function hasMiniAxe(main, upgrades) {
  return main === 'axe' && upgrades >= U.axe.miniAxeAt;
}

/** Розмір черги чакри з урахуванням прокачки. */
export function chakraBurst(upgrades = 0) {
  return BALANCE.weapons.chakra.burst + (upgrades >= U.chakra.extraAt ? U.chakra.extraBurst : 0);
}

/** Множник інтервалу атаки від прокачки основної зброї (<1 — частіше). */
export function upgradeIntervalMul(main, upgrades = 0) {
  if (!upgrades) return 1;
  if (main === 'axe') return U.axe.intervalStep ** upgrades;
  if (main === 'shotgun') return 1 / U.shotgun.speedStep ** upgrades;
  if (main === 'chakra') return 1 / U.chakra.speedStep ** upgrades;
  return 1;
}

/**
 * Цілі, які зачіпає коло радіуса r навколо center. sizeOf(t) — «радіус» самої цілі:
 * великий бос потрапляє під удар краєм тіла, а не лише центром.
 */
export function inRadius(center, targets, r, sizeOf = () => 0) {
  return targets.filter((t) => {
    const reach = r + sizeOf(t);
    return (t.x - center.x) ** 2 + (t.y - center.y) ** 2 <= reach * reach;
  });
}

/** Кути куль дробовика (радіани): у ціль і дві під ±spreadDeg; з прокачки extraAt — ще дві під ±extraDeg. */
export function shotgunAngles(aim, upgrades = 0) {
  const d = (BALANCE.weapons.shotgun.spreadDeg * Math.PI) / 180;
  const out = [aim, aim + d, aim - d];
  if (upgrades >= U.shotgun.extraAt) {
    const e = (U.shotgun.extraDeg * Math.PI) / 180;
    out.push(aim + e, aim - e);
  }
  return out;
}

export function createFireState() {
  return { cooldownMs: 0, burstLeft: 0 };
}

/**
 * Крок таймера атаки. hasTarget — чи є в кого бити (для сокири — хтось у радіусі).
 * Повертає { state, fire }. Без цілі не атакуємо, але й не втрачаємо готовність:
 * атака — щойно ціль з'явиться. Черга чакри не губиться, якщо ціль на мить зникла.
 */
export function stepFire(state, dt, { main, fireIntervalMs, hasTarget, upgrades = 0 }) {
  const cooldownMs = Math.max(state.cooldownMs - dt, 0);
  if (cooldownMs > 0 || !hasTarget) return { state: { ...state, cooldownMs }, fire: false };
  const up = upgradeIntervalMul(main, upgrades);
  if (main === 'chakra') {
    const c = BALANCE.weapons.chakra;
    const burstLeft = (state.burstLeft > 0 ? state.burstLeft : chakraBurst(upgrades)) - 1;
    const next = burstLeft > 0 ? c.burstGapMs : fireIntervalMs * c.reloadMul * up;
    return { state: { cooldownMs: next, burstLeft }, fire: true };
  }
  const mul = main === 'axe' ? BALANCE.weapons.axe.intervalMul : 1;
  return { state: { cooldownMs: fireIntervalMs * mul * up, burstLeft: 0 }, fire: true };
}
