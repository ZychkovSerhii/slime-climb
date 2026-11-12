// Режим налаштувань складності (після етапу 10): множники поверх BALANCE, щоб підбирати баланс без перезбирання.
// BALANCE заморожений, тому множники застосовують вузлові функції: Cycle (HP, швидкість), Difficulty (спавн),
// Health (лікування), GameScene.gainXp (досвід). Значення діють з наступного забігу (GameScene.create).
// Сховище передається ззовні — localStorage або підробка в тестах.

const KEY = 'slime-climb.tuning';

/** Режими лікування за новий рівень. 'game' — як у грі (етап 10: до 7 рівня кожен, далі парні). */
export const HEAL_MODES = ['game', 'every', 'even', 'none'];
export const HEAL_LABELS = { game: 'як у грі', every: 'кожен рівень', even: 'кожен 2-й', none: 'немає' };

/** Поля екрана налаштувань. Числові — множники (1 = як у грі). */
export const TUNING_FIELDS = [
  { key: 'enemyHp', label: 'HP ворогів', min: 0.5, max: 3, step: 0.1 },
  { key: 'enemySpeed', label: 'Швидкість ворогів', min: 0.5, max: 2, step: 0.1 },
  { key: 'spawn', label: 'Кількість ворогів', min: 0.5, max: 2.5, step: 0.1 },
  { key: 'spider', label: 'HP павучихи', min: 0.5, max: 4, step: 0.1 },
  { key: 'bear', label: 'HP ведмедя', min: 0.5, max: 4, step: 0.1 },
  { key: 'shkodko', label: 'HP Шкодька', min: 0.5, max: 4, step: 0.1 },
  { key: 'kolya', label: 'HP Колі', min: 0.5, max: 4, step: 0.1 },
  { key: 'xp', label: 'Досвід', min: 0.3, max: 2, step: 0.1 },
  { key: 'heal', label: 'Лікування', options: HEAL_MODES },
];

export function defaultTuning() {
  return { enemyHp: 1, enemySpeed: 1, spawn: 1, spider: 1, bear: 1, shkodko: 1, kolya: 1, xp: 1, heal: 'game' };
}

/**
 * Готові набори. «Важко» — припущення для перевірки на людині: босам 2 і 3 HP більше, ніж першому,
 * бо в першому колі між босами складність майже не росла (відгук після етапу 10).
 */
export const PRESETS = {
  easy: { name: 'Легко', values: { enemyHp: 0.8, enemySpeed: 0.9, spawn: 0.8, spider: 0.8, bear: 0.8, shkodko: 0.8, kolya: 0.8, xp: 1.2, heal: 'every' } },
  normal: { name: 'Норма', values: defaultTuning() },
  hard: { name: 'Важко', values: { enemyHp: 1.3, enemySpeed: 1.1, spawn: 1.2, spider: 1.3, bear: 1.3, shkodko: 1.6, kolya: 2, xp: 0.8, heal: 'even' } },
};

const round = (v) => Math.round(v * 100) / 100;

/** Будь-що (зламаний JSON, старі ключі, числа поза межами) → коректні налаштування. */
export function normalizeTuning(raw) {
  const t = defaultTuning();
  if (!raw || typeof raw !== 'object') return t;
  for (const f of TUNING_FIELDS) {
    const v = raw[f.key];
    if (f.options) {
      if (f.options.includes(v)) t[f.key] = v;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      t[f.key] = round(Math.min(Math.max(v, f.min), f.max));
    }
  }
  return t;
}

export function loadTuning(storage) {
  try {
    return normalizeTuning(JSON.parse(storage?.getItem(KEY) ?? 'null'));
  } catch {
    return defaultTuning();
  }
}

/** Повертає true, якщо сховище прийняло запис. Ніколи не кидає. */
export function saveTuning(storage, t) {
  try {
    if (!storage) return false;
    storage.setItem(KEY, JSON.stringify(normalizeTuning(t)));
    return true;
  } catch {
    return false;
  }
}

/** Крок поля на dir (+1 / −1): числа — у межах, режими — по колу. Не змінює вхід. */
export function stepField(t, key, dir) {
  const f = TUNING_FIELDS.find((x) => x.key === key);
  if (!f) return t;
  if (f.options) {
    const i = f.options.indexOf(t[key]);
    return { ...t, [key]: f.options[(i + dir + f.options.length) % f.options.length] };
  }
  return { ...t, [key]: round(Math.min(Math.max(t[key] + dir * f.step, f.min), f.max)) };
}

/** Назва набору, якому дорівнюють налаштування, або 'Свої'. */
export function presetName(t) {
  for (const p of Object.values(PRESETS)) {
    if (TUNING_FIELDS.every((f) => p.values[f.key] === t[f.key])) return p.name;
  }
  return 'Свої';
}

export function isDefault(t) {
  return presetName(t) === PRESETS.normal.name;
}

// ---- Поточні налаштування забігу (ставить GameScene.create; у тестах — типові) ----
let current = defaultTuning();

export function tuning() {
  return current;
}

export function setTuning(t) {
  current = normalizeTuning(t);
}

// бос у таблиці HP → ключ налаштувань (уламки Колі — як Коля)
const BOSS_KEY = { boss: 'spider', shkodko: 'shkodko', kolya: 'kolya', kolyaPart: 'kolya', bear: 'bear' };

/** Множник HP боса type (1, якщо тип не бос). */
export function bossHpTuning(type) {
  const k = BOSS_KEY[type];
  return k ? current[k] : 1;
}
