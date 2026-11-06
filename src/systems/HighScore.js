const KEY = 'slime-climb.highScore';

/** Рекорд зі сховища (localStorage). Будь-яка помилка чи сміття → 0. */
export function loadHighScore(storage) {
  try {
    const n = Number.parseInt(storage?.getItem(KEY) ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Зберігає score, якщо він кращий. Повертає актуальний рекорд. Ніколи не кидає. */
export function saveHighScore(storage, score) {
  const best = Math.max(loadHighScore(storage), Math.floor(score));
  try {
    storage?.setItem(KEY, String(best));
  } catch {
    // сховище недоступне (приватний режим, квота) — рекорд просто не збережеться
  }
  return best;
}

/** localStorage браузера або undefined, якщо доступ до нього кидає (деякі WebView/приватний режим). */
export function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Зберігає результат і каже, чи це новий рекорд: лише якщо score більший за попередній
 * і справді збережений (зі зламаним сховищем «рекорд» щоразу був би фальшивим).
 */
export function recordResult(storage, score) {
  const previous = loadHighScore(storage);
  const best = saveHighScore(storage, score);
  const persisted = loadHighScore(storage) === best;
  return { best, isNewRecord: persisted && score > previous };
}
