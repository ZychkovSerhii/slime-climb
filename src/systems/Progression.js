import { BALANCE } from '../config/balance.js';
import { cardLoot, maxLivesFor } from './Skills.js';

export const CARD_IDS = ['attackSpeed', 'damage', 'slow', 'invisibility', 'hat', 'extraLife'];
export const WEAPON_IDS = Object.keys(BALANCE.weapons);
const WEAPON_PREFIX = 'weapon:';

/** id картки зброї: 'weapon:axe'. */
export const weaponCard = (weaponId) => WEAPON_PREFIX + weaponId;

/** id зброї з id картки або null, якщо це звичайна картка. */
export function cardWeapon(cardId) {
  return cardId.startsWith(WEAPON_PREFIX) ? cardId.slice(WEAPON_PREFIX.length) : null;
}

/** Скільки досвіду треба, щоб з рівня level перейти на наступний. */
export function xpToNext(level) {
  return Math.round(BALANCE.xpBase * BALANCE.xpGrowth ** (level - 1));
}

export function createProgression() {
  return {
    level: 1,
    xp: 0,
    weapon: { fireIntervalMs: BALANCE.fireIntervalMs, damage: BALANCE.projectileDamage, slow: null },
    picks: {},
    // зброя з прогресом: progress — кроки кожної, main — основна (null — стартовий постріл),
    // lastOffered — зброя з попереднього вікна рівня (не пропонується двічі поспіль)
    arsenal: { progress: {}, main: null, lastOffered: null, lastTaken: null },
    // унікальні картки павучихи, взяті за забіг ('armor', 'venom', …)
    relics: [],
  };
}

/** Додає досвід; надлишок переходить на наступні рівні. Не змінює вхід. */
export function addXp(p, amount) {
  let { level, xp } = p;
  xp += amount;
  let levelsGained = 0;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    levelsGained += 1;
  }
  return { progression: { ...p, level, xp }, levelsGained };
}

export function availableCards(p) {
  return CARD_IDS.filter((id) => {
    if (id === 'attackSpeed') return p.weapon.fireIntervalMs > BALANCE.minFireIntervalMs;
    if (id === 'extraLife') return maxLivesFor(p.picks.extraLife) < BALANCE.skills.extraLife.maxLives;
    if (id === 'hat') return (p.picks.hat ?? 0) < BALANCE.skills.hat.maxPicks;
    return true;
  });
}

/** Базові картки сили пострілу: одна з них завжди є у вікні рівня. */
export const CORE_CARD_IDS = ['attackSpeed', 'damage', 'slow'];

/**
 * n різних випадкових карток з доступних (rng повертає [0, 1)).
 * [рішення 4b] Перша — завжди з базових (CORE_CARD_IDS), решта — з усього пулу. Інакше скіли «розбавляли» пул:
 * бот за 5 вікон жодного разу не побачив «Урон» і не вбив боса.
 */
export function rollCards(p, rng, n = 3) {
  const pool = availableCards(p);
  const pick = (from) => {
    const i = Math.min(Math.floor(rng() * from.length), from.length - 1);
    const id = from[i];
    pool.splice(pool.indexOf(id), 1);
    return id;
  };
  const out = [];
  const core = pool.filter((id) => CORE_CARD_IDS.includes(id));
  if (n > 0 && core.length) out.push(pick(core));
  while (out.length < n && pool.length) out.push(pick(pool));
  return out;
}

export function weaponProgress(p, weaponId) {
  return p.arsenal.progress[weaponId] ?? 0;
}

export function isWeaponMaxed(p, weaponId) {
  return weaponProgress(p, weaponId) >= BALANCE.weapons[weaponId].steps;
}

/**
 * Зброя для 3-ї картки.
 * [рішення, правки після 4a] Якщо в минулому вікні гравець узяв зброю і вона ще не вкачана — пропонуємо її ж,
 * щоб вкачування йшло підряд. Відмовився — випадкова з не вкачаних, але не та, що була в попередньому вікні.
 * Якщо лишилась одна зброя — її пропонуємо й підряд.
 */
export function rollWeapon(p, rng) {
  const open = WEAPON_IDS.filter((id) => !isWeaponMaxed(p, id));
  if (!open.length) return null;
  if (p.arsenal.lastTaken && open.includes(p.arsenal.lastTaken)) return p.arsenal.lastTaken;
  const pool = open.length > 1 ? open.filter((id) => id !== p.arsenal.lastOffered) : open;
  return pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)];
}

/**
 * Вікно рівня: 2 звичайні випадкові картки + 3-тя завжди зброя (якщо зброї не лишилось — звичайна).
 * Повертає картки і прогресію із запам'ятованою запропонованою зброєю.
 */
export function rollLevelUp(p, rng) {
  const weapon = rollWeapon(p, rng);
  const regular = rollCards(p, rng, weapon ? 2 : 3);
  const cards = weapon ? [...regular, weaponCard(weapon)] : regular;
  return { cards, progression: { ...p, arsenal: { ...p.arsenal, lastOffered: weapon, lastTaken: null } } };
}

/** Скільки шкоди додасть наступна картка «Урон»: перша +damageFirst, кожна наступна +damageNext. */
export function damageCardBonus(p) {
  return (p.picks.damage ?? 0) === 0 ? BALANCE.cards.damageFirst : BALANCE.cards.damageNext;
}

/** Застосовує картку до зброї. Не змінює вхід. */
export function applyCard(p, id) {
  const weaponId = cardWeapon(id);
  if (weaponId) return applyWeaponCard(p, weaponId, id);
  const loot = cardLoot(id);
  if (loot) return p.relics.includes(loot) ? p : { ...p, relics: [...p.relics, loot] };
  const w = { ...p.weapon };
  const c = BALANCE.cards;
  if (id === 'attackSpeed') {
    w.fireIntervalMs = Math.max(Math.round(w.fireIntervalMs * c.attackSpeedFactor), BALANCE.minFireIntervalMs);
  } else if (id === 'damage') {
    w.damage += damageCardBonus(p);
  } else if (id === 'slow') {
    w.slow = w.slow
      ? { ...w.slow, durationMs: w.slow.durationMs + c.slowStepMs }
      : { factor: c.slowFactor, durationMs: c.slowBaseMs };
  }
  return { ...p, weapon: w, picks: { ...p.picks, [id]: (p.picks[id] ?? 0) + 1 } };
}

/** Крок прогресу зброї; повний прогрес робить її основною (замінює попередню). */
function applyWeaponCard(p, weaponId, cardId) {
  const steps = BALANCE.weapons[weaponId].steps;
  const done = Math.min(weaponProgress(p, weaponId) + 1, steps);
  const arsenal = {
    ...p.arsenal,
    progress: { ...p.arsenal.progress, [weaponId]: done },
    main: done >= steps ? weaponId : p.arsenal.main,
    lastTaken: weaponId,
  };
  return { ...p, arsenal, picks: { ...p.picks, [cardId]: (p.picks[cardId] ?? 0) + 1 } };
}

/** Досвід за вбивство ворога типу type ('boss' — бос). */
export function killXp(type) {
  if (type === 'boss') return BALANCE.boss.xp;
  return BALANCE.enemies[type]?.xp ?? 0;
}
