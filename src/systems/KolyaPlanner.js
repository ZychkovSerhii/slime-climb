// Логіка боса «Слимак Коля» (етап 9, специфікація §9.2) без Phaser: фази, пороги HP, поділ, з'їдання,
// змійка, черга ривків, віяло крапель, позиція личинки-стрільця.
import { BALANCE } from '../config/balance.js';

const K = BALANCE.kolya;

/**
 * Фаза за часткою HP і подіями, що вже відбулися (events: { born, split }):
 * 'p1' → 'birth' (на phases.birth, раз) → 'p2' → 'split' (на phases.split, раз) → 'parts' (уламки, далі лють).
 * Лікування фазу не відкочує: після народження — щонайменше 'p2'.
 */
export function kolyaPhase(hpFrac, { born, split }) {
  if (!born) return hpFrac <= K.phases.birth ? 'birth' : 'p1';
  if (!split) return hpFrac <= K.phases.split ? 'split' : 'p2';
  return 'parts';
}

/** Мінімальне HP, поки подія не відбулась: інакше сильний удар (сокира, бомби) її б проскакував. */
export function kolyaHpFloor(maxHp, { born, split }) {
  if (!born) return K.phases.birth * maxHp;
  if (!split) return K.phases.split * maxHp;
  return 0;
}

/** HP уламків: сума = hp (якщо hp ≥ n), різниця між уламками ≤ 1, кожен ≥ 1. Більші — першими. */
export function splitHp(hp, n = K.split.parts) {
  const total = Math.max(Math.round(hp), n);
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/** HP після з'їдання решток: до eat.healTo × maxHp, але не менше за поточне. */
export function eatHeal(hp, maxHp) {
  return Math.max(hp, Math.round(K.eat.healTo * maxHp));
}

/**
 * Що робити після смерті уламка(ів): alive — скільки живих лишилось, eaten — з'їдання вже було.
 * 'eat' — останній з'їдає рештки (і коли двоє загинули в одному кадрі), 'dead' — нікого (усі в одному кадрі), 'none'.
 */
export function afterPartDeath(alive, eaten) {
  if (alive <= 0) return 'dead';
  if (alive === 1 && !eaten) return 'eat';
  return 'none';
}

/** Параметри режиму: 'p1' | 'p2' | 'part' (уламок) | 'rage'. spitEveryMs 0 — не плює. */
export function kolyaMode(mode) {
  if (mode === 'p1') return { speedMul: 1, lungeEveryMs: K.p1.lungeEveryMs, spitEveryMs: K.p1.spitEveryMs, fan: 1 };
  if (mode === 'p2') return { speedMul: 1, lungeEveryMs: K.p2.lungeEveryMs, spitEveryMs: K.p2.spitEveryMs, fan: 1 };
  if (mode === 'part') return { speedMul: K.split.speedMul, lungeEveryMs: K.split.lungeEveryMs, spitEveryMs: K.split.spitEveryMs, fan: 1 };
  return { speedMul: K.rage.speedMul, lungeEveryMs: K.rage.lungeEveryMs, spitEveryMs: K.rage.spitEveryMs, fan: K.rage.fan };
}

/** Зона, де повзе Коля (і його уламки): між стінами, від zone.top до (y гравця − bottomGap). */
export function kolyaBounds(width, halfW, playerY) {
  const minX = BALANCE.wallWidth + halfW;
  const maxX = Math.max(minX, width - BALANCE.wallWidth - halfW);
  const minY = K.zone.top;
  const maxY = Math.max(minY, playerY - K.zone.bottomGap);
  return { minX, maxX, minY, maxY };
}

/**
 * Змійка: позиція на «фазі руху» t (мс, уже помножених на швидкість): x — синусоїда по ширині, y — патруль угору-вниз.
 * offset — зсув фази (уламки повзуть не синхронно).
 */
export function snakePos(t, b, offset = 0) {
  const sx = Math.sin((2 * Math.PI * t) / K.snake.periodXMs + offset);
  const sy = Math.sin((2 * Math.PI * t) / K.snake.periodYMs + offset * 1.7);
  return { x: (b.minX + b.maxX) / 2 + ((b.maxX - b.minX) / 2) * sx, y: (b.minY + b.maxY) / 2 + ((b.maxY - b.minY) / 2) * sy };
}

// ---------- Черга ривків: одночасно телеграфує або летить лише один (Коля чи уламок) ----------

export function createLungeClock() {
  return { busy: false, freeAt: 0 };
}

/** Спроба почати ривок зараз: { clock, go }. */
export function tryLunge(clock, nowMs) {
  if (clock.busy || nowMs < clock.freeAt) return { clock, go: false };
  return { clock: { busy: true, freeAt: Infinity }, go: true };
}

/** Ривок закінчився (або тіло зникло посеред ривку): наступний — не раніше ніж через gapMs. */
export function endLunge(clock, nowMs) {
  return { busy: false, freeAt: nowMs + K.lunge.gapMs };
}

/** Кути віяла (радіани): count крапель через spreadDeg навколо aim. */
export function fanAngles(aim, count, spreadDeg) {
  const d = (spreadDeg * Math.PI) / 180;
  return Array.from({ length: count }, (_, i) => aim + (i - (count - 1) / 2) * d);
}

/**
 * Куди повзе личинка-стрілець: на keepPx від гравця в бік, де вона зараз, але не нижче (player.y − minAbovePx)
 * і в межах коридору b — плювок завжди згори, від нього рятує стрибок.
 */
export function spitterTarget(player, self, b) {
  const S = BALANCE.enemies.slugSpitter;
  let dx = self.x - player.x;
  let dy = Math.min(self.y - player.y, -S.minAbovePx);
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const x = Math.min(Math.max(player.x + dx * S.keepPx, b.minX), b.maxX);
  const y = Math.min(player.y + dy * S.keepPx, player.y - S.minAbovePx);
  return { x, y: Math.max(y, 60) };
}
