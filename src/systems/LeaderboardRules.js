// Правила таблиці лідерів (етап 12), спільні для гри і сервера (server/src/index.js імпортує цей файл).
// Сервер не довіряє грі, тому нік і правдоподібність перевіряються і тут, і там однаково.
import { BALANCE } from '../config/balance.js';
import { isProfane } from './Profanity.js';
import { isDefault } from './Tuning.js';

export const NICK_MIN = 3;
export const NICK_MAX = 16;
/** Довше трьох годин гра не живе — більше схоже на підробку. */
export const MAX_RUN_SEC = 3 * 3600;
/** Запас на округлення кадрів (очки висоти). */
const HEIGHT_SLACK = 2;

const NICK_CHARS = /^[\p{Script=Cyrillic}A-Za-z0-9 _.-]+$/u;

/** Нік від гравця → {ok, nick} (обрізаний, пробіли згорнуті) або {ok: false, error}. */
export function validateNick(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'short' };
  const nick = raw.trim().replace(/\s+/g, ' ');
  const len = [...nick].length;
  if (len < NICK_MIN) return { ok: false, error: 'short' };
  if (len > NICK_MAX) return { ok: false, error: 'long' };
  if (!NICK_CHARS.test(nick)) return { ok: false, error: 'chars' };
  if (isProfane(nick)) return { ok: false, error: 'profane' };
  return { ok: true, nick };
}

/**
 * Найбільша можлива висота за timeSec: висота в грі — це накопичена прокрутка (GameScene.update),
 * а прокрутка не швидша за min(scrollBase + scrollGrowth·t, maxScrollSpeed) (боси її лише сповільнюють).
 */
export function maxHeightPoints(timeSec) {
  const { scrollBase: v0, scrollGrowth: g, maxScrollSpeed: vMax, pxPerPoint } = BALANCE;
  const t = Math.max(0, timeSec);
  const tSat = (vMax - v0) / g;
  const px = t <= tSat ? v0 * t + (g * t * t) / 2 : v0 * tSat + (g * tSat * tSat) / 2 + vMax * (t - tSat);
  return Math.ceil(px / pxPerPoint) + HEIGHT_SLACK;
}

export function isPlausible(r) {
  if (!r || typeof r !== 'object') return false;
  const { height, timeSec } = r;
  return (
    Number.isInteger(height) && height >= 0 && typeof timeSec === 'number' && Number.isFinite(timeSec) &&
    timeSec >= 0 && timeSec <= MAX_RUN_SEC && height <= maxHeightPoints(timeSec)
  );
}

/** Чи йде забіг у таблицю: лише «Норма» без змін і без жодного параметра в URL (усі вони — дебаг). */
export function isEligibleRun({ tuning, search }) {
  return isDefault(tuning) && (search ?? '') === '';
}
