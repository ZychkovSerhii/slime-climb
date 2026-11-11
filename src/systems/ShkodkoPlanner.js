// Логіка боса «Шкодько» (етап 6b, специфікація §6.2) без Phaser: фази, точки танцю, бомби, подарунковий дощ, HP-пороги.
import { BALANCE } from '../config/balance.js';

const S = BALANCE.shkodko;

/**
 * Фаза за часткою HP. Фази не відкочуються: prev — поточна фаза (1…4), лікування дощем її не знижує.
 * 'train' і 'rage' (після потяга) керує сам бос, ця функція рахує лише 1–4.
 */
export function phaseFor(hpFrac, prev = 1) {
  let p = 1;
  if (hpFrac <= S.phases.p4) p = 4;
  else if (hpFrac <= S.phases.p3) p = 3;
  else if (hpFrac <= S.phases.p2) p = 2;
  return Math.max(p, prev);
}

/** Параметри танцю для фази (1, 2, 3) або 'rage'. */
export function danceCfg(phase) {
  if (phase === 'rage') return S.dance.rage;
  return S.dance[`p${Math.min(Math.max(phase, 1), 3)}`];
}

/**
 * Наступна точка танцю. stopNo рахується з 1; кожна aimEvery-та — на гравця (x у межах коридору, y — його висота).
 * bounds: { minX, maxX, minY, maxY }.
 */
export function danceTarget(stopNo, aimEvery, player, bounds, rng) {
  const clampX = (x) => Math.min(Math.max(x, bounds.minX), bounds.maxX);
  const clampY = (y) => Math.min(Math.max(y, bounds.minY), bounds.maxY);
  // націлена точка — прямо на гравця (нижче зони): так Шкодько «інколи б'є»; від нього рятує стрибок на іншу стіну
  if (aimEvery > 0 && stopNo % aimEvery === 0) return { x: clampX(player.x), y: Math.max(player.y, bounds.minY), aimed: true };
  return {
    x: bounds.minX + rng() * (bounds.maxX - bounds.minX),
    y: bounds.minY + rng() * (bounds.maxY - bounds.minY),
    aimed: false,
  };
}

/** Зона танцю: між стінами, від zone.top до (y гравця − bottomGap). */
export function danceBounds(width, halfW, playerY) {
  const minX = BALANCE.wallWidth + halfW;
  const maxX = width - BALANCE.wallWidth - halfW;
  const minY = S.zone.top;
  const maxY = Math.max(minY, playerY - S.zone.bottomGap);
  return { minX, maxX, minY, maxY };
}

/**
 * Куди падають n бомб: частка nearPlayerShare — біля гравця (±nearSpreadPx по x, по y — на його висоті),
 * решта — випадково в коридорі між zone.top і висотою гравця. laneMin/laneMax — межі центру бомби.
 */
export function bombTargets(n, player, laneMin, laneMax, rng) {
  const B = S.bomb;
  const clamp = (x) => Math.min(Math.max(x, laneMin), laneMax);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (rng() < B.nearPlayerShare) {
      out.push({ x: clamp(player.x + (rng() * 2 - 1) * B.nearSpreadPx), y: player.y - rng() * 40 });
    } else {
      out.push({ x: laneMin + rng() * (laneMax - laneMin), y: S.zone.top + rng() * (player.y - S.zone.top) });
    }
  }
  return out;
}

/** Запал бомби: випадково в [fuseMinMs, fuseMaxMs]. */
export function bombFuseMs(rng) {
  return S.bomb.fuseMinMs + rng() * (S.bomb.fuseMaxMs - S.bomb.fuseMinMs);
}

/** Чи зачіпає вибух гравця. */
export function blastHits(bomb, player, radius = S.bomb.radiusPx) {
  return Math.hypot(bomb.x - player.x, bomb.y - player.y) <= radius;
}

// ---------- Подарунковий дощ (фаза 3) ----------

/** Стан дощу: { startMs, spawned, collected, done }. Подарунки з'являються рівномірно за durationMs. */
export function createRush(nowMs) {
  return { startMs: nowMs, spawned: 0, collected: 0, done: false };
}

/** Скільки подарунків уже мало з'явитися на nowMs (перший — одразу). */
export function rushDueCount(rush, nowMs) {
  const R = S.rush;
  const k = Math.floor(((nowMs - rush.startMs) / R.durationMs) * R.count) + 1;
  return Math.min(Math.max(k, 0), R.count);
}

/** Дощ скінчився: час вийшов (плюс час падіння останнього — його ще можна зловити). */
export function rushOver(rush, nowMs, fallMs) {
  return nowMs >= rush.startMs + S.rush.durationMs + fallMs;
}

/**
 * Лікування після дощу (частка maxHp): ціль не виконано → healEach за кожен незібраний,
 * але HP не вище healCap. hp — поточне, повертає нове HP.
 */
export function rushHeal(hp, maxHp, collected) {
  const R = S.rush;
  if (collected >= R.goal) return hp;
  const missed = R.count - collected;
  const healed = hp + missed * R.healEach * maxHp;
  return Math.max(hp, Math.min(healed, R.healCap * maxHp));
}

// ---------- Потяг і лють ----------

/**
 * Шкода по Шкодьку, що визирає з потяга: HP не опускається нижче peekFloor (визирання не добиває).
 * Повертає нове HP.
 */
export function peekDamage(hp, maxHp, damage) {
  const floor = S.train.peekFloor * maxHp;
  if (hp <= floor) return hp;
  return Math.max(hp - damage, floor);
}

/** HP після потяга: min(поточне, rageHpCap), але не менше 1. */
export function afterTrainHp(hp, maxHp) {
  return Math.max(1, Math.min(hp, Math.round(S.rageHpCap * maxHp)));
}

/** x-и вагонів на старті проїзду: dir +1 — їде вправо (стартує зліва за краєм). Перший — паровоз. */
export function trainLayout(n, dir, width, carW) {
  const step = carW + S.train.wagonGapPx;
  const start = dir > 0 ? -carW / 2 : width + carW / 2;
  return Array.from({ length: n }, (_, i) => start - dir * i * step);
}

/** Чи весь потяг (останній вагон) виїхав за протилежний край. */
export function trainGone(xs, dir, width, carW) {
  if (!xs.length) return true;
  return dir > 0 ? Math.min(...xs) > width + carW / 2 : Math.max(...xs) < -carW / 2;
}

/** Кути віяла цукерок навколо напрямку aim (радіани). */
export function candyAngles(aim) {
  const C = S.candy;
  const d = (C.spreadDeg * Math.PI) / 180;
  return Array.from({ length: C.count }, (_, i) => aim + (i - (C.count - 1) / 2) * d);
}
