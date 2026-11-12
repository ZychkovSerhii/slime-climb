// Клієнт таблиці лідерів (етап 12): ID пристрою, нік, черга результату, запити до Worker'а.
// Сховище й fetch передаються ззовні (тести). Жодна функція не кидає: мережа і сховище можуть зламатися,
// гра від цього не має гальмувати чи падати.
import { isPlausible, validateNick } from './LeaderboardRules.js';

const ID_KEY = 'slime-climb.lb.id';
const NICK_KEY = 'slime-climb.lb.nick';
const PENDING_KEY = 'slime-climb.lb.pending';
const DEFAULT_TIMEOUT_MS = 5000;

const read = (storage, key) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};
const write = (storage, key, value) => {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/** Випадковий ID пристрою (16 hex), створюється один раз. Зі зламаним сховищем — новий щоразу. */
export function playerId(storage, random = Math.random) {
  const saved = read(storage, ID_KEY);
  if (saved && /^[0-9a-f]{16}$/.test(saved)) return saved;
  let id = '';
  for (let i = 0; i < 16; i++) id += Math.floor(random() * 16).toString(16);
  write(storage, ID_KEY, id);
  return id;
}

export function loadNick(storage) {
  const v = validateNick(read(storage, NICK_KEY));
  return v.ok ? v.nick : null;
}

export function saveNick(storage, nick) {
  const v = validateNick(nick);
  return v.ok && write(storage, NICK_KEY, v.nick);
}

export function pendingResult(storage) {
  try {
    const r = JSON.parse(read(storage, PENDING_KEY) ?? 'null');
    return isPlausible(r) ? { height: r.height, timeSec: r.timeSec } : null;
  } catch {
    return null;
  }
}

/** Ставить результат у чергу, якщо він кращий за той, що вже чекає. Неправдоподібний — ігнорує. */
export function enqueueResult(storage, { height, timeSec }) {
  const r = { height, timeSec };
  if (!isPlausible(r)) return;
  const old = pendingResult(storage);
  if (old && old.height >= height) return;
  write(storage, PENDING_KEY, JSON.stringify(r));
}

/** fetch з таймаутом; повертає {status, body} або null (мережа, таймаут, не-JSON). */
async function request(url, init, { fetchFn = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      ctrl?.abort();
      resolve(null);
    }, timeoutMs);
  });
  const run = (async () => {
    try {
      const res = await fetchFn(url, { ...init, signal: ctrl?.signal });
      const body = await res.json();
      return { status: res.status, body };
    } catch {
      return null;
    }
  })();
  try {
    return await Promise.race([run, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const jsonPost = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Надсилає результат із черги. Див. statusLine щодо статусів. */
export async function flush(storage, { url = '', fetchFn, timeoutMs } = {}) {
  if (!url) return { status: 'disabled' };
  const nick = loadNick(storage);
  if (!nick) return { status: 'nonick' };
  const pending = pendingResult(storage);
  if (!pending) return { status: 'empty' };
  const r = await request(`${url}/score`, jsonPost({ id: playerId(storage), nick, ...pending }), { fetchFn, timeoutMs });
  if (r?.status === 200 && Number.isInteger(r.body?.rank)) {
    write(storage, PENDING_KEY, null);
    return { status: 'sent', rank: r.body.rank, best: r.body.best };
  }
  if (r?.status === 400 || r?.status === 422) {
    write(storage, PENDING_KEY, null);
    return { status: 'rejected' };
  }
  return { status: 'offline' };
}

export async function fetchTop(storage, { url = '', fetchFn, timeoutMs } = {}) {
  if (!url) return { status: 'disabled' };
  const r = await request(`${url}/top?id=${playerId(storage)}`, { method: 'GET' }, { fetchFn, timeoutMs });
  if (r?.status !== 200 || !Array.isArray(r.body?.top)) return { status: 'offline' };
  return { status: 'ok', top: r.body.top, me: r.body.me ?? null };
}

/** Зберігає нік локально (навіть офлайн) і повідомляє сервер. */
export async function sendNick(storage, raw, { url = '', fetchFn, timeoutMs } = {}) {
  const v = validateNick(raw);
  if (!v.ok) return 'invalid';
  saveNick(storage, v.nick);
  if (!url) return 'disabled';
  const r = await request(`${url}/nick`, jsonPost({ id: playerId(storage), nick: v.nick }), { fetchFn, timeoutMs });
  if (r?.status === 200) return 'ok';
  if (r?.status === 422) return 'invalid';
  return 'offline';
}

/** Рядок на екрані кінця забігу. result — відповідь flush або ще немає (надсилається). */
export function statusLine({ eligible, result }) {
  if (!eligible) return 'Не Норма — у таблицю не йде';
  if (!result) return 'Надсилається…';
  switch (result.status) {
    case 'nonick': return 'Введи нік у «Лідери», щоб потрапити в таблицю';
    case 'sent': return `Твоє місце: ${result.rank}`;
    case 'rejected': return 'Результат не прийнято';
    case 'offline': return 'Офлайн — надішлемо пізніше';
    default: return '';
  }
}
