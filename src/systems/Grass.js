// Біом 5 «Трав'яні пагорби»: Волохань, лучник, вершник, Пшикач, день → ніч, гнила плоть. Чисті функції без Phaser.
// Дизайн — docs/superpowers/specs/2026-11-21-grass-biome-design.md.
import { BALANCE } from '../config/balance.js';

const E = BALANCE.enemies;
const N = BALANCE.grass.night;
const F = BALANCE.zombie.flesh;

/** Волохань повз униз по стіні — на lungeYFrac висоти екрана час стрибати. */
export function spiderShouldLunge(y, screenH) {
  return y >= screenH * E.hairySpider.lungeYFrac;
}

/** Лучник стріляє, лише коли вище за гравця щонайменше на minAbovePx (крута траєкторія — рятує стрибок, як від квітки). */
export function archerMayFire(archerY, playerY) {
  return playerY - archerY >= E.archer.minAbovePx;
}

/** Висота, на якій лучник ходить (у верхній частині екрана). */
export function archerBand(screenH) {
  return { minY: screenH * E.archer.minYFrac, maxY: screenH * E.archer.maxYFrac };
}

/**
 * Вершник: HP разом (60 бази). Павук гине, щойно знято spiderHp частку від maxHp (з тим самим множником біому),
 * тоді лучник лишається з рештою HP. Повертає true, коли павука вже немає.
 */
export function riderSpiderDead(hp, maxHp) {
  const archerShare = 1 - E.rider.spiderHp / E.rider.hp;
  return hp <= maxHp * archerShare + 1e-9;
}

/** Пшикач запалює ґніт, коли до гравця ближче fusePx. */
export function puffShouldFuse(dist) {
  return dist <= E.puffball.fusePx;
}

/**
 * Скільки життів знімає вибух Пшикача на відстані dist (від центру до центру): майже впритул (contactPx) —
 * contactDamage (ТЗ: −3), у radiusPx — 1, далі — 0.
 */
export function puffBlastDamage(dist) {
  const P = E.puffball;
  if (dist <= P.contactPx) return P.contactDamage;
  if (dist <= P.radiusPx) return 1;
  return 0;
}

/**
 * День → ніч за ms від початку біому (рішення Claude): сонце йде зліва направо dayMs (sunT 0…1),
 * далі fadeMs темніє до alpha і лишається ніч (moon). Світанку немає.
 * Повертає { sunT: 0…1 | null, dark: 0…alpha, moon: bool }.
 */
export function dayNight(ms) {
  if (ms < N.dayMs) return { sunT: Math.max(ms, 0) / N.dayMs, dark: 0, moon: false };
  const k = Math.min((ms - N.dayMs) / N.fadeMs, 1);
  return { sunT: null, dark: N.alpha * k, moon: true };
}

/** Чи падає гнила плоть з малого мерця (шанс 40%, ТЗ). */
export function fleshDrops(rng) {
  return rng() < F.chance;
}

/**
 * Що дає гнила плоть. З повними життями її не підібрати (null — лежить далі, рішення Claude).
 * 90% — тимчасове серце (tempMs), 10% — звичайне +1 життя (ТЗ).
 */
export function fleshEffect(rng, livesFull) {
  if (livesFull) return null;
  return rng() < F.tempChance ? 'temp' : 'life';
}
