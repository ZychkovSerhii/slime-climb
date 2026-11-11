import { BALANCE } from '../config/balance.js';

const B = BALANCE.boss;

/** Плашка «БОС: …» — останні bannerSec перед появою боса. */
export function bannerVisible(tSec, atSec = B.atSec) {
  return tSec >= atSec - B.bannerSec && tSec < atSec;
}

/** Чи заборонені шипи і звичайні вороги на цьому етапі (карту очищено для бою з босом). */
export function hazardsSuppressed(stage) {
  return stage === 'prep' || stage === 'fight' || stage === 'calm';
}

/**
 * Множник інтервалів спавну після боса: коли тиша закінчилась — afterRampMul,
 * далі лінійно до 1 за afterRampSec. До смерті боса — 1.
 */
export function afterBossSpawnMul(tSec, killedAtSec) {
  if (killedAtSec === null) return 1;
  const k = (tSec - killedAtSec - B.calmSec) / B.afterRampSec;
  if (k >= 1) return 1;
  return B.afterRampMul - (B.afterRampMul - 1) * Math.max(k, 0);
}

/**
 * x наступного удару павука: з імовірністю strikeChance — над гравцем (±strikeSpreadPx),
 * інакше — випадкова точка коридору. Завжди в межах [laneMin, laneMax].
 */
export function pickStrikeX(playerX, rng, laneMin, laneMax) {
  let x;
  if (rng() < B.strikeChance) {
    x = playerX + (rng() * 2 - 1) * B.strikeSpreadPx;
  } else {
    x = laneMin + rng() * (laneMax - laneMin);
  }
  return Math.min(Math.max(x, laneMin), laneMax);
}

/** Фаза 2 (рій) — один раз за бій, коли HP впало до swarmAt. */
export function shouldStartSwarm(hp, maxHp, swarmDone) {
  return !swarmDone && hp <= maxHp * B.swarmAt;
}

/** Поріг люті як частка HP: випадково в [rageMin, rageMax]. */
export function pickRageAt(rng) {
  return B.rageMin + rng() * (B.rageMax - B.rageMin);
}

export function isRage(hp, maxHp, rageAt) {
  return hp <= maxHp * rageAt;
}

/** Таймінги атаки фази 1; у люті — у rageSpeedMul раз швидші (коротша тінь і пауза, швидше падіння). */
export function attackTimings(rage) {
  const m = rage ? B.rageSpeedMul : 1;
  return {
    telegraphMs: B.telegraphMs / m,
    dropSpeed: B.dropSpeed * m,
    retreatSpeed: B.retreatSpeed * m,
    restMs: B.restMs / m,
  };
}

/** Скільки павучків у наступному заході рою: ті, що вижили, +growth (до max). 0 — рій знищено. */
export function nextSwarmSize(survivors) {
  if (survivors <= 0) return 0;
  return Math.min(survivors + B.swarm.growth, B.swarm.max);
}

/** Чи наступна атака — плювок (кожна spit.every-та, у люті — кожна rageEvery-та), а не удар. attackNo рахується з 1. */
export function isSpitAttack(attackNo, rage = false) {
  const every = rage ? B.spit.rageEvery : B.spit.every;
  return attackNo > 0 && attackNo % every === 0;
}

/** Кути грудок плювка (радіани): віяло навколо напрямку aim; у люті грудок більше. */
export function spitAngles(aim, rage) {
  const n = rage ? B.spit.rageCount : B.spit.count;
  const d = (B.spit.spreadDeg * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => aim + (i - (n - 1) / 2) * d);
}
