import { BALANCE } from '../config/balance.js';

/** Бос стартує один раз: на atSec (за замовчуванням boss.atSec), якщо його ще не було. */
export function shouldStartBoss(tSec, bossState, atSec = BALANCE.boss.atSec) {
  return tSec >= atSec && bossState === 'none';
}

/**
 * x наступного удару павука: з імовірністю strikeChance — над гравцем (±strikeSpreadPx),
 * інакше — випадкова точка коридору. Завжди в межах [laneMin, laneMax].
 */
export function pickStrikeX(playerX, rng, laneMin, laneMax) {
  const b = BALANCE.boss;
  let x;
  if (rng() < b.strikeChance) {
    x = playerX + (rng() * 2 - 1) * b.strikeSpreadPx;
  } else {
    x = laneMin + rng() * (laneMax - laneMin);
  }
  return Math.min(Math.max(x, laneMin), laneMax);
}

/** Павучки з'являються лише коли павук висить угорі — не під час падіння біля гравця. */
export function canSpawnMinions(bossState) {
  return bossState === 'rest' || bossState === 'telegraph';
}
