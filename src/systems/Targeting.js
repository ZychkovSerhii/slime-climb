import { BALANCE } from '../config/balance.js';
/** Найближча активна ціль до точки from або null. При рівній відстані — перша в масиві. */
export function pickNearest(from, targets) {
  let best = null;
  let bestD = Infinity;
  for (const t of targets) {
    if (t.active === false) continue;
    const dx = t.x - from.x;
    const dy = t.y - from.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

/**
 * Точка зустрічі снаряда (швидкість speed, старт from) з ціллю, що рухається рівномірно
 * (target: { x, y, vx, vy }, px/s). Снаряд летить по прямій — це упередження, а не самонаведення.
 * Якщо наздогнати неможливо — повертає поточну позицію цілі.
 */
export function interceptPoint(from, target, speed) {
  const px = target.x - from.x;
  const py = target.y - from.y;
  const vx = target.vx;
  const vy = target.vy;
  const a = vx * vx + vy * vy - speed * speed;
  const b = 2 * (vx * px + vy * py);
  const c = px * px + py * py;

  let t;
  if (Math.abs(a) < 1e-9) {
    t = b !== 0 ? -c / b : -1;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return { x: target.x, y: target.y };
    const r = Math.sqrt(disc);
    const t1 = (-b - r) / (2 * a);
    const t2 = (-b + r) / (2 * a);
    const ts = [t1, t2].filter((v) => v > 0);
    t = ts.length ? Math.min(...ts) : -1;
  }
  if (!(t > 0)) return { x: target.x, y: target.y };
  return { x: target.x + vx * t, y: target.y + vy * t };
}

/** Чи може рослина на висоті plantY стріляти в гравця на висоті playerY: лише коли вона вище на minAbovePx. */
export function plantMayFire(plantY, playerY) {
  return playerY - plantY >= BALANCE.enemies.plant.minAbovePx;
}
