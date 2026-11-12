// Фільтр мату для ніків таблиці лідерів (етап 12). Спільний для гри і сервера (server/src/index.js).
// Це список коренів, а не модерація: щось пропустить, щось зайве зловить («Мусука»). Записи, що проскочили,
// видаляють вручну в консолі D1 (docs/leaderboard-setup.md).

// Корені після нормалізації (кирилиця без і/ї/є/ё — див. fold). Довгі й однозначні — будь-де в рядку
// (ловлять і «х.у.й»); короткі, що трапляються всередині звичайних слів (Себастьян, Кебаб, Асука), — лише на початку слова.
const ROOTS_ANYWHERE = [
  'хуй', 'хуя', 'пизд', 'бля', 'блад', 'залуп', 'гандон', 'пидор', 'пидарас', 'педик', 'шлюх', 'мудак', 'мудил',
  'дроч', 'гавн', 'говн', 'fuck', 'shit', 'bitch', 'cunt', 'nigg', 'whore', 'pussy',
];
const ROOTS_WORD_START = ['еба', 'ебл', 'ебу', 'ебн', 'хуе', 'хуи', 'сука', 'суки', 'сучка', 'dick', 'fag'];

// Латиниця, схожа на кирилицю за виглядом (xyй → хуй)
const LOOKALIKE = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у', i: 'і', u: 'и', '3': 'з', '0': 'о', '6': 'б', '@': 'а', $: 'с' };
// Латиниця як транслітерація (suka, huy, pizdec, bl@d)
const DIGRAPHS = [['shch', 'щ'], ['zh', 'ж'], ['ch', 'ч'], ['sh', 'ш'], ['ya', 'я'], ['ja', 'я'], ['yu', 'ю'], ['yo', 'е'], ['kh', 'х']];
const PHONETIC = { a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', x: 'х', c: 'ц', y: 'й', w: 'в', '@': 'а', '0': 'о', '3': 'з', $: 'с' };

// і/ї/є/ё → и/и/е/е: укр і рос корені збігаються (пізда/пизда, єбать/ебать)
const fold = (s) => s.replace(/[іїi]/g, 'и').replace(/[єё]/g, 'е').replace(/ґ/g, 'г');
// лише літери; повтори згортаються (ХУЙЙЙ → хуй)
const squeeze = (s) => s.replace(/[^\p{L}]/gu, '').replace(/(.)\1+/gu, '$1');

const mapChars = (s, table) => [...s].map((ch) => table[ch] ?? ch).join('');

function phonetic(s) {
  let r = s;
  for (const [from, to] of DIGRAPHS) r = r.split(from).join(to);
  return mapChars(r, PHONETIC);
}

/** Варіанти рядка для зіставлення з коренями: як є (англійські), латиниця-двійники, транслітерація. */
export function normalizeForFilter(s) {
  const lower = String(s ?? '').toLowerCase();
  return [squeeze(lower), squeeze(fold(mapChars(lower, LOOKALIKE))), squeeze(fold(phonetic(lower)))];
}

export function isProfane(s) {
  const text = String(s ?? '');
  if (normalizeForFilter(text).some((v) => ROOTS_ANYWHERE.some((r) => v.includes(r)))) return true;
  // слова розділяє все, крім літер і символів-замінників (@ $ цифри)
  const words = text.split(/[^\p{L}@$0-9]+/u).filter(Boolean);
  return words.some((w) => normalizeForFilter(w).some((v) => ROOTS_WORD_START.some((r) => v.startsWith(r))));
}
