// Фільтр мату для ніків таблиці лідерів (етап 12). Спільний для гри і сервера (server/src/index.js).
// Це список коренів, а не модерація: щось пропустить, щось зайве зловить («Мусука»). Записи, що проскочили,
// видаляють вручну в консолі D1 (docs/leaderboard-setup.md).

// Корені після нормалізації (кирилиця без і/ї/є/ё — див. fold)
const ROOTS = [
  'хуй', 'хуе', 'хуя', 'хуи', 'пизд', 'еба', 'ебл', 'ебан', 'ебу', 'бля', 'блад', 'сука', 'сучк', 'суки',
  'мудак', 'мудил', 'залуп', 'гандон', 'пидор', 'пидарас', 'педик', 'шлюх', 'дроч', 'гавн', 'говн',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'nigg', 'fag', 'whore', 'pussy',
];

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

/** Варіанти рядка для зіставлення з коренями. */
export function normalizeForFilter(s) {
  const lower = String(s ?? '').toLowerCase();
  return [
    squeeze(lower), // англійські корені як є
    squeeze(fold(mapChars(lower, LOOKALIKE))),
    squeeze(fold(phonetic(lower))),
  ];
}

export function isProfane(s) {
  return normalizeForFilter(s).some((v) => ROOTS.some((root) => v.includes(root)));
}
