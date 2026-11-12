// Коло біомів (етап 6b, етап 9): печера (павучиха) → зима (Шкодько) → бамбук (Коля) → печера (павучиха) → …
// Чисті функції без Phaser. Відрізок — один біом з одним босом наприкінці.
import { BALANCE } from '../config/balance.js';

const B = BALANCE.boss;

/**
 * Перший відрізок забігу. start: 'cave' (звичайно), 'winter' (?winter=1 — зима без боса),
 * 'shkodko' (?shkodko=1 — зима і Шкодько на shkodko.debugAtSec), 'spider' (?boss=1 — павучиха на boss.debugAtSec),
 * 'bamboo' (?bamboo=1 — бамбук без боса), 'kolya' (?kolya=1 — бамбук і Коля на kolya.debugAtSec).
 */
export function firstSegment(start = 'cave') {
  if (start === 'winter') return { biome: 'winter', boss: null, atSec: Infinity, loop: 0, startSec: 0 };
  if (start === 'shkodko') return { biome: 'winter', boss: 'shkodko', atSec: BALANCE.shkodko.debugAtSec, loop: 0, startSec: 0 };
  if (start === 'bamboo') return { biome: 'bamboo', boss: null, atSec: Infinity, loop: 0, startSec: 0 };
  if (start === 'kolya') return { biome: 'bamboo', boss: 'kolya', atSec: BALANCE.kolya.debugAtSec, loop: 0, startSec: 0 };
  const atSec = start === 'spider' ? B.debugAtSec : B.atSec;
  return { biome: 'cave', boss: 'spider', atSec, loop: 0, startSec: 0 };
}

/** Відрізок після смерті боса seg.boss на секунді killSec. Після Колі починається нове коло. */
export function nextSegment(seg, killSec) {
  if (seg.boss === 'spider') {
    return { biome: 'winter', boss: 'shkodko', atSec: killSec + BALANCE.shkodko.afterSec, loop: seg.loop, startSec: killSec };
  }
  if (seg.boss === 'shkodko') {
    return { biome: 'bamboo', boss: 'kolya', atSec: killSec + BALANCE.kolya.afterSec, loop: seg.loop, startSec: killSec };
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

/** Множники кола loop (з 0): HP ворогів і босів ×hpMul^loop, швидкість руху ×speedMul^loop. */
export function loopMul(loop) {
  return { hp: BALANCE.cycle.hpMul ** loop, speed: BALANCE.cycle.speedMul ** loop };
}

/** HP з урахуванням кола: округлено, не менше 1. */
export function scaledHp(baseHp, loop) {
  return Math.max(1, Math.round(baseHp * loopMul(loop).hp));
}
