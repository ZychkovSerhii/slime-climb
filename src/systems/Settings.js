// Налаштування гравця (етап 6a: сніг; етап 9: туман; етап 11: іскри лави). Сховище передається ззовні — localStorage або підробка в тестах.
const KEY = 'slime-climb.settings';

export function defaultSettings() {
  return { snow: true, fog: true, embers: true };
}

/** Будь-що (зламаний JSON, старі значення) → коректні налаштування. */
export function loadSettings(storage) {
  const s = defaultSettings();
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (raw && typeof raw.snow === 'boolean') s.snow = raw.snow;
    if (raw && typeof raw.fog === 'boolean') s.fog = raw.fog;
    if (raw && typeof raw.embers === 'boolean') s.embers = raw.embers;
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
