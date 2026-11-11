import { BALANCE } from '../config/balance.js';

// Чиста логіка скілів етапу 4b і унікальних карток павучихи. Без Phaser — легко тестувати.

const S = BALANCE.skills;
const L = BALANCE.bossLoot;

/** Невидимість після n взять: { durationMs, cooldownMs }; n = 0 — скіла немає (null). */
export function invisStats(n) {
  if (!n) return null;
  const I = S.invisibility;
  return {
    durationMs: I.durationMs + I.durStepMs * (n - 1),
    cooldownMs: Math.max(I.cooldownMs - I.cdStepMs * (n - 1), I.cdMinMs),
  };
}

export function createInvis() {
  return { activeUntil: 0, readyAt: 0 };
}

/** Чи можна натиснути кнопку зараз. */
export function invisReady(inv, nowMs) {
  return nowMs >= inv.readyAt;
}

/** Натискання кнопки: якщо готово — невидимість на durationMs, перезарядка рахується від натискання. */
export function activateInvis(inv, stats, nowMs) {
  if (!stats || !invisReady(inv, nowMs)) return inv;
  return { activeUntil: nowMs + stats.durationMs, readyAt: nowMs + stats.cooldownMs };
}

export function isInvisible(inv, nowMs) {
  return nowMs < inv.activeUntil;
}

/** Частка перезарядки, що вже минула: 1 — готово (для кільця на кнопці). */
export function invisCharge(inv, stats, nowMs) {
  if (!stats || nowMs >= inv.readyAt) return 1;
  return 1 - (inv.readyAt - nowMs) / stats.cooldownMs;
}

/** Шляпи після n взять: { count, damage }. Шкода — сума кроків damageSteps за перші min(n, 4) взять. */
export function hatStats(n) {
  if (!n) return { count: 0, damage: 0 };
  const steps = S.hat.damageSteps;
  const damage = steps.slice(0, Math.min(n, steps.length)).reduce((a, b) => a + b, 0);
  return { count: n >= S.hat.maxPicks ? 2 : 1, damage };
}

/** Максимум життів з урахуванням карток «Додаткове життя». */
export function maxLivesFor(extraLifePicks) {
  return Math.min(BALANCE.maxLives + (extraLifePicks ?? 0), S.extraLife.maxLives);
}

// ---------- Унікальні картки павучихи ----------

export const LOOT_IDS = ['armor', 'venom', 'oksana', 'web', 'form'];
const LOOT_PREFIX = 'loot:';
export const lootCard = (id) => LOOT_PREFIX + id;
export function cardLoot(cardId) {
  return cardId.startsWith(LOOT_PREFIX) ? cardId.slice(LOOT_PREFIX.length) : null;
}

/** offer випадкових ще не взятих трофеїв (може бути менше або 0, якщо майже все взято). */
export function rollLoot(taken, rng) {
  const pool = LOOT_IDS.filter((id) => !taken.includes(id));
  const out = [];
  while (out.length < L.offer && pool.length) {
    const i = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
    out.push(pool.splice(i, 1)[0]);
  }
  return out.map(lootCard);
}

/** Множник стрибка: зброя × форма павука, але не більше maxJumpMul. */
export function jumpMul(weaponMul, hasForm) {
  return Math.min(weaponMul * (hasForm ? L.form.jumpSpeedMul : 1), L.maxJumpMul);
}

// ---------- Броня («Кожух з павучихи») ----------

/** Стан броні: on — чорне життя є; regenAt — коли відновиться після втрати. */
export function createArmor() {
  return { on: true, regenAt: 0 };
}

/** Крок часу: втрачена броня відновлюється через regenMs. */
export function stepArmor(a, nowMs) {
  if (a && !a.on && nowMs >= a.regenAt) return { on: true, regenAt: 0 };
  return a;
}

/** Удар забирає броню (замість життя). Повертає нову броню. */
export function breakArmor(a, nowMs) {
  return { on: false, regenAt: nowMs + L.armor.regenMs };
}

// ---------- Ефекти влучань ----------

/**
 * Ефекти одного влучання основною зброєю: картка «Сповільнення» (slow), «Ядовита морда» (venom → slow + dot),
 * «Дупа павучихи» (web → root). Сповільнення не складаються: береться сильніше.
 * Бос сповільнюється лише до slow.bossFactor (крига — −5%).
 */
export function hitEffects(slowCard, relics) {
  // «Крижана атака» (картка slow): сповільнення + заморозка; боса лише на bossFactor
  let slow = slowCard ? { factor: slowCard.factor, durationMs: slowCard.durationMs, bossFactor: slowCard.bossFactor } : null;
  let dot = slowCard?.dps ? { dps: slowCard.dps, durationMs: slowCard.durationMs } : null;
  const ice = Boolean(slowCard?.ice);
  if (relics.includes('venom')) {
    const v = L.venom;
    if (!slow || slow.factor > v.slowFactor) slow = { factor: v.slowFactor, durationMs: v.slowMs, bossFactor: v.slowFactor };
    // [рішення] заморозка й отрута складаються в одну шкоду за секунду
    dot = { dps: (dot?.dps ?? 0) + v.dps, durationMs: Math.max(dot?.durationMs ?? 0, v.durationMs) };
  }
  if (slow) slow.ice = ice;
  const root = relics.includes('web') ? { ms: L.web.rootMs, bossMs: L.web.bossRootMs } : null;
  return { slow, dot, root };
}

/**
 * Отрута на ворогові: тики по 1 с. state { until, nextTickAt, dps } або null.
 * Повертає { state, damage } — скільки шкоди нанести за цей крок.
 */
export function stepDot(state, nowMs) {
  if (!state) return { state: null, damage: 0 };
  let damage = 0;
  let next = state.nextTickAt;
  while (next <= nowMs && next <= state.until) {
    damage += state.dps;
    next += 1000;
  }
  const done = next > state.until;
  return { state: done ? null : { ...state, nextTickAt: next }, damage };
}

/** Нова отрута від влучання: оновлює тривалість (не стакується). Перший тик — через 1 с. */
export function applyDot(state, dot, nowMs) {
  return { dps: dot.dps, until: nowMs + dot.durationMs, nextTickAt: state ? state.nextTickAt : nowMs + 1000 };
}
