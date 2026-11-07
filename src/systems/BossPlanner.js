import { BALANCE } from '../config/balance.js';

const B = BALANCE.boss;

/**
 * Етап забігу відносно боса:
 * 'before' → 'prep' (за prepSec до боса: шипи й вороги зникають) → 'fight' → 'calm' (calmSec після смерті) → 'after'.
 * killedAtSec — секунда смерті боса або null.
 */
export function bossStage(tSec, { atSec = B.atSec, killedAtSec = null } = {}) {
  if (killedAtSec !== null) return tSec < killedAtSec + B.calmSec ? 'calm' : 'after';
  if (tSec >= atSec) return 'fight';
  if (tSec >= atSec - B.prepSec) return 'prep';
  return 'before';
}

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
