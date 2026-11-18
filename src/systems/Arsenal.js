import { BALANCE } from '../config/balance.js';

// Етап 14: два слоти зброї (чиста логіка, без Phaser). Слот 0 на старті — стандартна атака слизака (START),
// слот 1 — порожній (null). arsenal.main — завжди зброя активного слота (null для стандартної атаки):
// його й далі читають Combat, WeaponView, стрибок чакри й тексти карток.

export const START = 'start';
const SLOT_PREFIX = 'slot:';
export const KEEP_SLOTS = 'keep';

/** id картки вибору слота: 'slot:0', 'slot:1' або 'slot:keep' («Не брати»). */
export const slotCard = (slot) => SLOT_PREFIX + slot;

/** Номер слота (0/1), KEEP_SLOTS або null, якщо це не картка слота. */
export function cardSlot(cardId) {
  if (!cardId.startsWith(SLOT_PREFIX)) return null;
  const v = cardId.slice(SLOT_PREFIX.length);
  return v === KEEP_SLOTS ? KEEP_SLOTS : Number(v);
}

/** Зброя активного слота: id або null (стандартна атака чи порожньо). */
export function mainOf(a) {
  const w = a.slots[a.active];
  return w && w !== START ? w : null;
}

const withMain = (a) => ({ ...a, main: mainOf(a) });

export function createSlots() {
  return { slots: [START, null], active: 0, pending: null };
}

/** Зброя в слотах (без стандартної атаки). */
export function slotWeapons(a) {
  return a.slots.filter((w) => w && w !== START);
}

/** Чи можна перемикатись: зайняті обидва слоти. */
export function canSwitch(a) {
  return a.slots.every(Boolean);
}

/** Перемкнути на інший слот (якщо обидва зайняті). Не змінює вхід. */
export function switchSlot(a) {
  if (!canSwitch(a)) return a;
  return withMain({ ...a, active: 1 - a.active });
}

/**
 * Зброя щойно вкачана до кінця. Порожній слот — стає туди й одразу в руки;
 * обидва зайняті — чекає вибору гравця (pending): GameScene показує вікно «Куди поставити?».
 */
export function weaponReady(a, weaponId) {
  if (a.slots.includes(weaponId)) return a;
  const free = a.slots.indexOf(null);
  if (free < 0) return { ...a, pending: weaponId };
  const slots = a.slots.slice();
  slots[free] = weaponId;
  return withMain({ ...a, slots, active: free });
}

/**
 * Вибір гравця для pending: slot 0/1 — замінити, KEEP_SLOTS — не брати.
 * Викинута зброя (і та, від якої відмовились) губить прогрес відкриття — її можна знайти знову;
 * рівень прокачки (upgrades) зберігається.
 */
export function placePending(a, slot) {
  const w = a.pending;
  if (!w) return a;
  const progress = { ...a.progress };
  if (slot === KEEP_SLOTS) {
    progress[w] = 0;
    return { ...a, progress, pending: null, lastTaken: null };
  }
  const old = a.slots[slot];
  if (old && old !== START) progress[old] = 0;
  const slots = a.slots.slice();
  slots[slot] = w;
  return withMain({ ...a, slots, active: slot, progress, pending: null, lastTaken: null });
}

/** Коротка назва для кнопки зброї (до ~8 літер). */
export function slotShort(w) {
  if (w === START) return 'Слиз';
  return w ? BALANCE.weapons[w].short ?? BALANCE.weapons[w].name : '';
}

/** Назва вмісту слота для карток. */
export function slotName(w) {
  if (w === START) return 'Стандартна атака';
  return w ? BALANCE.weapons[w].name : 'порожньо';
}
