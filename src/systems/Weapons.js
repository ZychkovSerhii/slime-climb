import { BALANCE } from '../config/balance.js';

// Чиста логіка атак основної зброї (етап 4a). main — id зброї з BALANCE.weapons або null (стартовий постріл).

/** Шкода одного удару: поточна шкода пострілу (база + «Урон») × множник зброї. */
export function attackDamage(main, baseDamage) {
  return baseDamage * (BALANCE.weapons[main]?.damageMul ?? 1);
}

/** Множник швидкості стрибка від зброї (Ворота чакри — швидші стрибки). */
export function weaponJumpMul(main) {
  return BALANCE.weapons[main]?.jumpSpeedMul ?? 1;
}

/** Радіус розмаху сокири для ширини екрана width. */
export function axeRadius(width) {
  return width * BALANCE.weapons.axe.radiusFrac;
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

/** Кути куль дробовика (радіани): у ціль і дві під ±spreadDeg. */
export function shotgunAngles(aim) {
  const d = (BALANCE.weapons.shotgun.spreadDeg * Math.PI) / 180;
  return [aim, aim + d, aim - d];
}

export function createFireState() {
  return { cooldownMs: 0, burstLeft: 0 };
}

/**
 * Крок таймера атаки. hasTarget — чи є в кого бити (для сокири — хтось у радіусі).
 * Повертає { state, fire }. Без цілі не атакуємо, але й не втрачаємо готовність:
 * атака — щойно ціль з'явиться. Черга чакри не губиться, якщо ціль на мить зникла.
 */
export function stepFire(state, dt, { main, fireIntervalMs, hasTarget }) {
  const cooldownMs = Math.max(state.cooldownMs - dt, 0);
  if (cooldownMs > 0 || !hasTarget) return { state: { ...state, cooldownMs }, fire: false };
  if (main === 'chakra') {
    const c = BALANCE.weapons.chakra;
    const burstLeft = (state.burstLeft > 0 ? state.burstLeft : c.burst) - 1;
    const next = burstLeft > 0 ? c.burstGapMs : fireIntervalMs * c.reloadMul;
    return { state: { cooldownMs: next, burstLeft }, fire: true };
  }
  const mul = main === 'axe' ? BALANCE.weapons.axe.intervalMul : 1;
  return { state: { cooldownMs: fireIntervalMs * mul, burstLeft: 0 }, fire: true };
}
