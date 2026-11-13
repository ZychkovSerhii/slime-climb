// Коло біомів (етап 6b, 9, 11): печера (павучиха) → зима (ведмідь, Шкодько) → бамбук (Коля) → лава (Казан) → печера → …
// Чисті функції без Phaser. Відрізок — один біом з одним босом наприкінці.
import { BALANCE } from '../config/balance.js';
import { bossHpTuning, tuning } from './Tuning.js';

const B = BALANCE.boss;

/**
 * Перший відрізок забігу. start: 'cave' (звичайно), 'winter' (?winter=1 — зима без боса),
 * 'shkodko' (?shkodko=1 — зима і Шкодько на shkodko.debugAtSec), 'spider' (?boss=1 — павучиха на boss.debugAtSec),
 * 'bamboo' (?bamboo=1 — бамбук без боса), 'kolya' (?kolya=1 — бамбук і Коля на kolya.debugAtSec),
 * 'bear' (?bear=1 — зима і ведмідь на bearBoss.debugAtSec, далі Шкодько),
 * 'lava' (?lava=1 — лава без боса), 'kazan' (?kazan=1 — лава і Казан на kazan.debugAtSec).
 * loop — з якого кола почати (?loop=N, етап 11: перевірка контуру й посилень).
 */
export function firstSegment(start = 'cave', loop = 0) {
  return { ...firstSegmentAt(start), loop };
}

function firstSegmentAt(start) {
  if (start === 'winter') return { biome: 'winter', boss: null, atSec: Infinity, loop: 0, startSec: 0 };
  if (start === 'shkodko') return { biome: 'winter', boss: 'shkodko', atSec: BALANCE.shkodko.debugAtSec, loop: 0, startSec: 0 };
  if (start === 'bamboo') return { biome: 'bamboo', boss: null, atSec: Infinity, loop: 0, startSec: 0 };
  if (start === 'kolya') return { biome: 'bamboo', boss: 'kolya', atSec: BALANCE.kolya.debugAtSec, loop: 0, startSec: 0 };
  if (start === 'bear') return { biome: 'winter', boss: 'bear', atSec: BALANCE.bearBoss.debugAtSec, loop: 0, startSec: 0 };
  if (start === 'lava') return { biome: 'lava', boss: null, atSec: Infinity, loop: 0, startSec: 0 };
  if (start === 'kazan') return { biome: 'lava', boss: 'kazan', atSec: BALANCE.kazan.debugAtSec, loop: 0, startSec: 0 };
  const atSec = start === 'spider' ? B.debugAtSec : B.atSec;
  return { biome: 'cave', boss: 'spider', atSec, loop: 0, startSec: 0 };
}

/**
 * Відрізок після смерті боса seg.boss на секунді killSec. Після Казана (етап 11) починається нове коло.
 * Етап 10: зима ділиться на два відрізки — ведмідь (через bearBoss.afterSec після павучихи) і Шкодько
 * (через shkodko.afterSec після павучихи, але не раніше shkodkoGapSec після ведмедя). startSec — початок зими.
 */
export function nextSegment(seg, killSec) {
  if (seg.boss === 'spider') {
    return { biome: 'winter', boss: 'bear', atSec: killSec + BALANCE.bearBoss.afterSec, loop: seg.loop, startSec: killSec };
  }
  if (seg.boss === 'bear') {
    const atSec = Math.max(seg.startSec + BALANCE.shkodko.afterSec, killSec + BALANCE.bearBoss.shkodkoGapSec);
    return { biome: 'winter', boss: 'shkodko', atSec, loop: seg.loop, startSec: seg.startSec };
  }
  if (seg.boss === 'shkodko') {
    return { biome: 'bamboo', boss: 'kolya', atSec: killSec + BALANCE.kolya.afterSec, loop: seg.loop, startSec: killSec };
  }
  if (seg.boss === 'kolya') {
    return { biome: 'lava', boss: 'kazan', atSec: killSec + BALANCE.kazan.afterSec, loop: seg.loop, startSec: killSec };
  }
  return { biome: 'cave', boss: 'spider', atSec: killSec + B.atSec, loop: seg.loop + 1, startSec: killSec };
}

/**
 * Етап відносно боса поточного відрізка:
 * 'calm' (calmSec після смерті попереднього боса) → 'before'/'after' → 'prep' (prepSec до боса) → 'fight'.
 * lastKillSec — секунда смерті попереднього боса або null.
 */
export function runStage(tSec, seg, lastKillSec = null) {
  if (lastKillSec !== null && tSec < lastKillSec + B.calmSec) return 'calm';
  if (seg.boss && tSec >= seg.atSec) return 'fight';
  if (seg.boss && tSec >= seg.atSec - B.prepSec) return 'prep';
  return lastKillSec === null ? 'before' : 'after';
}

const BIOME_ORDER = { cave: 0, winter: 1, bamboo: 2, lava: 3 };
const BIOMES_PER_LOOP = Object.keys(BIOME_ORDER).length;
const SC = BALANCE.scaling;

/** Скільки біомів уже пройдено (етап 10, §10.1; етап 11 — 4 у колі): печера кола 0 → 0, …, лава → 3, печера кола 1 → 4… */
export function biomeIndex(seg) {
  return (seg?.loop ?? 0) * BIOMES_PER_LOOP + (BIOME_ORDER[seg?.biome] ?? 0);
}

/** Множник швидкості кола loop (з 0): ×speedMul^loop. HP — enemyHp / bossHp. */
export function loopMul(loop) {
  return { speed: BALANCE.cycle.speedMul ** loop * tuning().enemySpeed };
}

/** HP звичайного ворога: ×biomeHpMul^biome (і множник режиму налаштувань), округлено, не менше 1. */
export function enemyHp(baseHp, biome) {
  return Math.max(1, Math.round(baseHp * SC.biomeHpMul ** biome * tuning().enemyHp));
}

/** Шкода помічника (Оксанка): база + бонус «Урону», ×biomeHpMul^biome — щоб не відставала від HP ворогів. */
export function familiarDamage(base, weaponDamage, biome) {
  return (base + (weaponDamage - BALANCE.projectileDamage)) * SC.biomeHpMul ** biome;
}

/** HP боса (і ведмедя-міні-боса): ×bossHpMul^loop і множник режиму налаштувань для type ('boss', 'bear'…). */
export function bossHp(baseHp, loop, type = null) {
  return Math.max(1, Math.round(baseHp * SC.bossHpMul ** loop * bossHpTuning(type)));
}

/** З якого кола вороги мають властивості, а боси — +1 атаку. */
export function enhanced(loop) {
  return loop >= SC.enhancedFromLoop;
}
