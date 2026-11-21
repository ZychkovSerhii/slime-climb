// Бос 5 «Мрець-Велетень»: фази, удар рукою, курка. Чисті функції без Phaser. Частки HP — від maxHp.
import { BALANCE } from '../config/balance.js';

const Z = BALANCE.zombie;
const EPS = 1e-9;

/**
 * Фаза за часткою HP і подіями: 'p1' → 'summon' (раз, 65%) → 'p2' → 'hen' (раз, 40%) → 'ride' (на курці) →
 * 'rage' (курку вбито). Фази не відкочуються.
 */
export function zombiePhase(hpFrac, { summoned, mounted, henDead }) {
  if (henDead) return 'rage';
  if (mounted) return 'ride';
  if (summoned) return hpFrac <= Z.phases.hen + EPS ? 'hen' : 'p2';
  return hpFrac <= Z.phases.summon + EPS ? 'summon' : 'p1';
}

/** Нижче цього HP удар не опускає, поки подію фази (виклик мерців, курка) не відіграно. */
export function zombieHpFloor(maxHp, { summoned, mounted }) {
  if (!summoned) return maxHp * Z.phases.summon;
  if (!mounted) return maxHp * Z.phases.hen;
  return 0;
}

/** Інтервал між ударами рукою: після смерті курки — у after.strikeMul раза частіше. */
export function strikeEveryMs({ henDead }) {
  return henDead ? Z.strike.everyMs / Z.after.strikeMul : Z.strike.everyMs;
}

/** Швидкість гойдання: звичайно speed (120), на курці — курчина (700), після курки — ×after.speedMul (240). */
export function swaySpeed({ mounted, henDead }) {
  if (henDead) return Z.speed * Z.after.speedMul;
  if (mounted) return Z.hen.speed;
  return Z.speed;
}

/**
 * Смуга удару рукою на стіні side: від внутрішнього краю стіни wPx у коридор, hPx завдовжки з центром на висоті centerY.
 * Ширина не більша за половину коридору мінус 40 px — друга половина й інша стіна лишаються вільними.
 */
export function strikeZone(side, centerY, screenW, wallW = BALANCE.wallWidth) {
  const corridor = screenW - 2 * wallW;
  const w = Math.min(Z.strike.wPx, corridor / 2 - 40);
  const x = side === 'left' ? wallW : screenW - wallW - w;
  return { x, y: centerY - Z.strike.hPx / 2, w, h: Z.strike.hPx, side };
}

/** Чи зачіпає удар гравця (центр слизака в смузі). */
export function strikeHits(zone, px, py) {
  return px >= zone.x && px <= zone.x + zone.w && py >= zone.y && py <= zone.y + zone.h;
}

/**
 * Курка ухиляється (рішення Claude): є куля гравця ближче dodgeNearPx і кулдаун минув → відскок убік на dodgePx
 * (у бік від кулі, але в межах [minX, maxX]). shots — [{ x, y }]. Повертає нове x або null.
 */
export function henDodgeX({ x, y, nowMs, lastDodgeAt, shots, minX, maxX }) {
  const H = Z.hen;
  if (nowMs - lastDodgeAt < H.dodgeCdMs) return null;
  const near = shots.find((s) => Math.hypot(s.x - x, s.y - y) <= H.dodgeNearPx);
  if (!near) return null;
  let dir = near.x <= x ? 1 : -1;
  if (x + dir * H.dodgePx > maxX || x + dir * H.dodgePx < minX) dir = -dir;
  return Math.min(Math.max(x + dir * H.dodgePx, minX), maxX);
}

/** Скільки малих мерців у хвилі i (з 0) і чи це остання. */
export function summonWave(i) {
  const S = Z.summon;
  const left = S.count - i * S.perWave;
  return { n: Math.max(Math.min(S.perWave, left), 0), last: left <= S.perWave };
}
