// Налаштування гравця (етап 6a: сніг). Сховище передається ззовні — localStorage або підробка в тестах.
const KEY = 'slime-climb.settings';

export function defaultSettings() {
  return { snow: true };
}

/** Будь-що (зламаний JSON, старі значення) → коректні налаштування. */
export function loadSettings(storage) {
  const s = defaultSettings();
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (raw && typeof raw.snow === 'boolean') s.snow = raw.snow;
  } catch {
    // лишаються типові
  }
  return s;
}

/** Повертає true, якщо сховище прийняло запис. Ніколи не кидає. */
export function saveSettings(storage, settings) {
  try {
    if (!storage) return false;
    storage.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
