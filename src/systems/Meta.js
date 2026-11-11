// Мета-прогрес між забігами (етап 5): Шаги, куплені скіни, лічильники вбивств, досягнення.
// Чисті функції: стан — звичайний об'єкт, сховище передається ззовні (localStorage або підробка в тестах).
import { BALANCE } from '../config/balance.js';

const KEY = 'slime-climb.meta';
const M = BALANCE.meta;

/** Порожній стан нового гравця. */
export function emptyMeta() {
  return { steps: 0, owned: ['slime'], skin: 'slime', kills: {}, achievements: {} };
}

const isCount = (n) => Number.isInteger(n) && n >= 0;

/** Приводить будь-що (зламаний JSON, старі версії, підроблені значення) до коректного стану. */
export function normalizeMeta(raw) {
  const m = emptyMeta();
  if (!raw || typeof raw !== 'object') return m;
  if (isCount(raw.steps)) m.steps = raw.steps;
  const skinIds = new Set(M.skins.map((s) => s.id));
  if (Array.isArray(raw.owned)) m.owned = [...new Set(['slime', ...raw.owned.filter((id) => skinIds.has(id))])];
  if (m.owned.includes(raw.skin)) m.skin = raw.skin;
  if (raw.kills && typeof raw.kills === 'object') {
    for (const [k, v] of Object.entries(raw.kills)) if (isCount(v)) m.kills[k] = v;
  }
  if (raw.achievements && typeof raw.achievements === 'object') {
    const ids = new Set(M.achievements.map((a) => a.id));
    for (const [id, v] of Object.entries(raw.achievements)) {
      if (ids.has(id) && v && typeof v === 'object') m.achievements[id] = { claimed: v.claimed === true };
    }
  }
  return m;
}

/** Стан зі сховища. Будь-яка помилка → стан нового гравця. */
export function loadMeta(storage) {
  try {
    return normalizeMeta(JSON.parse(storage?.getItem(KEY) ?? 'null'));
  } catch {
    return emptyMeta();
  }
}

/** Зберігає стан. Повертає true, якщо сховище прийняло запис. Ніколи не кидає. */
export function saveMeta(storage, meta) {
  try {
    if (!storage) return false;
    storage.setItem(KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

/** Скільки Шагів дає вбивство ворога типу type. */
export function stepsForKill(type) {
  return M.stepsPerKill[type] ?? 0;
}

/** Id досягнень, умова яких виконана, але які ще не отримані. */
function newlyEarned(meta) {
  return M.achievements.filter((a) => !meta.achievements[a.id] && (meta.kills[a.stat] ?? 0) >= a.count).map((a) => a.id);
}

/**
 * Вбивство: +Шаги, +1 до лічильника типу, перевірка досягнень.
 * Повертає { meta, steps, unlocked } — unlocked: щойно отримані досягнення (для тосту).
 */
export function recordKill(meta, type) {
  const steps = stepsForKill(type);
  const next = { ...meta, steps: meta.steps + steps, kills: { ...meta.kills, [type]: (meta.kills[type] ?? 0) + 1 }, achievements: { ...meta.achievements } };
  const unlocked = newlyEarned(next);
  for (const id of unlocked) next.achievements[id] = { claimed: false };
  return { meta: next, steps, unlocked: unlocked.map(achievementById) };
}

export function achievementById(id) {
  return M.achievements.find((a) => a.id === id);
}

export function skinById(id) {
  return M.skins.find((s) => s.id === id);
}

/** Ключ спрайта вдягненого скіна. */
export function skinSprite(meta) {
  return (skinById(meta.skin) ?? M.skins[0]).sprite;
}

/** Купівля скіна. Купленого одразу вдягаємо. Повертає { meta, ok, reason } (reason: 'owned' | 'poor' | 'unknown'). */
export function buySkin(meta, id) {
  const skin = skinById(id);
  if (!skin) return { meta, ok: false, reason: 'unknown' };
  if (meta.owned.includes(id)) return { meta, ok: false, reason: 'owned' };
  if (meta.steps < skin.price) return { meta, ok: false, reason: 'poor' };
  return { meta: { ...meta, steps: meta.steps - skin.price, owned: [...meta.owned, id], skin: id }, ok: true };
}

/** Вдягнути куплений скін. Некуплений — стан без змін. */
export function equipSkin(meta, id) {
  return meta.owned.includes(id) ? { ...meta, skin: id } : meta;
}

/** Забрати нагороду отриманого досягнення. Повертає { meta, reward } (0 — нічого забирати). */
export function claimAchievement(meta, id) {
  const a = achievementById(id);
  const st = meta.achievements[id];
  if (!a || !st || st.claimed) return { meta, reward: 0 };
  return {
    meta: { ...meta, steps: meta.steps + a.reward, achievements: { ...meta.achievements, [id]: { claimed: true } } },
    reward: a.reward,
  };
}

/** Скільки нагород чекає в меню досягнень. */
export function unclaimedCount(meta) {
  return Object.values(meta.achievements).filter((v) => !v.claimed).length;
}

/**
 * Список для меню досягнень. Неотримане — приховане: { hidden: true } без назви й підпису.
 * Отримане — { title, caption, reward, claimed }.
 */
export function achievementList(meta) {
  return M.achievements.map((a) => {
    const st = meta.achievements[a.id];
    if (!st) return { id: a.id, hidden: true };
    return { id: a.id, hidden: false, title: a.title, caption: a.caption, reward: a.reward, claimed: st.claimed };
  });
}
