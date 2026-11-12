// Білий ведмідь — міні-бос (етап 10, §10.2): серії стрибків, аура, миші на допомогу. Без Phaser.
import { BALANCE } from '../config/balance.js';

const BB = BALANCE.bearBoss;

/** Скільки стрибків у серії: посилений (коло 1+) — на enhancedJumps більше. */
export function bearJumps(enhanced = false) {
  return BB.jump.jumps + (enhanced ? BB.jump.enhancedJumps : 0);
}

/** Повзання між серіями: випадково в [crawlMinMs, crawlMaxMs]. */
export function crawlMs(rng) {
  return BB.crawlMinMs + rng() * (BB.crawlMaxMs - BB.crawlMinMs);
}

/** Де повзає ведмідь (центр по y): від zone.top до (y гравця − zone.bottomGap), не нижче top. */
export function bearZone(playerY) {
  const minY = BB.zone.top;
  return { minY, maxY: Math.max(minY, playerY - BB.zone.bottomGap) };
}

/** Миші на допомогу — раз, коли HP упало до batsAt. */
export function bearBatsDue(hpFrac, done) {
  return !done && hpFrac <= BB.batsAt;
}

/** Вилетів за край біля x: з'являється на протилежній стіні. */
export function reenterSide(exitX, width) {
  return exitX < width / 2 ? 'right' : 'left';
}

/** Чи час ставати на задні лапи: аури немає і минуло rearEveryMs від попереднього ричання (перше — rearFirstMs від появи). */
export function rearDue(nowMs, nextRearAt, auraUp) {
  return !auraUp && nowMs >= nextRearAt;
}
