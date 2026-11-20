// Фідбек-8: трансформації («раси») і їхні кнопки. Без Phaser.
// Без «Полукровки» діє остання взята трансформація (як раніше); з нею — усі взяті одразу.
import { BALANCE } from '../config/balance.js';
import { FORM_IDS, activeForm } from './ShkodkoLoot.js';

/** Кнопка трансформації: 'swarm' (павук), 'train' (Шкодько), 'clones' (Коля). У Казана кнопки немає. */
export const FORM_ABILITY = { form: 'swarm', iam: 'train', iamkolya: 'clones' };

export const hasHalfblood = (p) => (p.picks?.halfblood ?? 0) > 0;

/** Діючі трансформації в порядку FORM_IDS. */
export function activeForms(relics, halfblood) {
  if (!halfblood) {
    const f = activeForm(relics);
    return f ? [f] : [];
  }
  return FORM_IDS.filter((id) => relics.includes(id));
}

/** Чи діє трансформація id для прогресу p. */
export function hasForm(p, id) {
  return activeForms(p.relics, hasHalfblood(p)).includes(id);
}

/** Кнопки, які зараз мають бути на екрані (ability ids). */
export function formAbilities(p) {
  return activeForms(p.relics, hasHalfblood(p)).map((f) => FORM_ABILITY[f]).filter(Boolean);
}

/** Чи можна взяти «Полукровку»: ще не взята і є хоч одна трансформація. */
export function canOfferHalfblood(p) {
  return !hasHalfblood(p) && p.relics.some((r) => FORM_IDS.includes(r));
}

/** Перезарядка: state — { [ability]: readyAt }. */
export function abilityReady(state, ability, nowMs) {
  return nowMs >= (state[ability] ?? 0);
}

export function useAbility(state, ability, nowMs, cdMs = BALANCE.forms.cdMs) {
  if (!abilityReady(state, ability, nowMs)) return state;
  return { ...state, [ability]: nowMs + cdMs };
}

/** Частка перезарядки, що вже минула (1 — готово), для кільця на кнопці. */
export function abilityCharge(state, ability, nowMs, cdMs = BALANCE.forms.cdMs) {
  const at = state[ability] ?? 0;
  if (nowMs >= at) return 1;
  return 1 - (at - nowMs) / cdMs;
}

/**
 * Шлях потяга «Я ШКОДЬКО»: ряди від top до bottom через rowGap, від стіни до стіни, вниз і назад угору; повтор,
 * доки шлях не довший за minLen. x0/x1 — крайні x центру паровоза.
 */
export function rideZigzag(x0, x1, top, bottom, rowGap, minLen) {
  const rows = [];
  for (let y = top; y <= bottom; y += rowGap) rows.push(y);
  if (!rows.length) rows.push(top);
  const cycle = rows.length > 1 ? [...rows, ...rows.slice(1, -1).reverse()] : rows;
  const pts = [];
  let len = 0;
  let side = 0;
  for (let i = 0; len < minLen || pts.length < 2; i++) {
    const y = cycle[i % cycle.length];
    const a = { x: side ? x1 : x0, y };
    const b = { x: side ? x0 : x1, y };
    for (const p of [a, b]) {
      if (pts.length) len += Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y);
      pts.push(p);
    }
    side = 1 - side;
    if (i > 10000) break;
  }
  return pts;
}

// аура ведмедя й вагони потяга Шкодька — частини боса: їх не ваншотимо, лише bossDamage
const BOSS_PARTS = ['bearAura', 'wagon'];

/** Що робить дотик потяга: 'kill' — дрібний ворог, 'boss' — шкода босу (якщо минула перезарядка), null — нічого. */
export function rideHit(enemy, lastHitAt, nowMs, T = BALANCE.forms.train) {
  if (!enemy.isBoss && !BOSS_PARTS.includes(enemy.type)) return 'kill';
  return nowMs - (lastHitAt ?? -Infinity) >= T.bossHitCdMs ? 'boss' : null;
}
