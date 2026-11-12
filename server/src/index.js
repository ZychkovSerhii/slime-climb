// Cloudflare Worker таблиці лідерів (етап 12). D1: binding DB, схема — server/schema.sql.
// Правила (нік, мат, правдоподібність) — ті самі, що в грі: src/systems/LeaderboardRules.js.
import { isPlausible, validateNick } from '../../src/systems/LeaderboardRules.js';

const TOP_LIMIT = 50;
const MIN_GAP_MS = 20_000;
const ID_RE = /^[0-9a-f]{16}$/;
const ALLOWED_ORIGIN = /^(https:\/\/localhost|capacitor:\/\/localhost|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGIN.test(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

const json = (request, status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } });

async function readBody(request) {
  try {
    const b = await request.json();
    return b && typeof b === 'object' && !Array.isArray(b) ? b : null;
  } catch {
    return null;
  }
}

/** Перевірка тіла: id і нік. Повертає {nick} або Response з помилкою. */
async function checkCommon(request, env, body, now) {
  if (!body || !ID_RE.test(body.id ?? '')) return { error: json(request, 400, { error: 'bad_request' }) };
  const v = validateNick(body.nick);
  if (!v.ok) return { error: json(request, 422, { error: v.error }) };
  const row = await env.DB.prepare('SELECT last_submit_at FROM scores WHERE id = ?').bind(body.id).first();
  if (row && now - row.last_submit_at < MIN_GAP_MS) return { error: json(request, 429, { error: 'too_often' }) };
  return { nick: v.nick };
}

async function rankOf(env, id) {
  const me = await env.DB.prepare('SELECT height, updated_at FROM scores WHERE id = ?').bind(id).first();
  if (!me || me.height <= 0) return null;
  const r = await env.DB
    .prepare('SELECT COUNT(*) AS n FROM scores WHERE height > ?1 OR (height = ?1 AND updated_at < ?2)')
    .bind(me.height, me.updated_at)
    .first();
  return { rank: Number(r.n) + 1, height: me.height };
}

async function postScore(request, env, now) {
  const body = await readBody(request);
  const c = await checkCommon(request, env, body, now);
  if (c.error) return c.error;
  const run = { height: body.height, timeSec: body.timeSec };
  if (!isPlausible(run)) return json(request, 422, { error: 'implausible' });
  await env.DB
    .prepare(
      `INSERT INTO scores (id, nick, height, time_sec, updated_at, last_submit_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
       ON CONFLICT(id) DO UPDATE SET
         nick = excluded.nick,
         time_sec = CASE WHEN excluded.height > scores.height THEN excluded.time_sec ELSE scores.time_sec END,
         updated_at = CASE WHEN excluded.height > scores.height THEN excluded.updated_at ELSE scores.updated_at END,
         height = MAX(scores.height, excluded.height),
         last_submit_at = excluded.last_submit_at`,
    )
    .bind(body.id, c.nick, run.height, Math.round(run.timeSec), now)
    .run();
  const me = await rankOf(env, body.id);
  return json(request, 200, { rank: me?.rank ?? 0, best: me?.height ?? 0 });
}

async function postNick(request, env, now) {
  const body = await readBody(request);
  const c = await checkCommon(request, env, body, now);
  if (c.error) return c.error;
  await env.DB
    .prepare(
      `INSERT INTO scores (id, nick, height, time_sec, updated_at, last_submit_at) VALUES (?1, ?2, 0, 0, ?3, ?3)
       ON CONFLICT(id) DO UPDATE SET nick = excluded.nick, last_submit_at = excluded.last_submit_at`,
    )
    .bind(body.id, c.nick, now)
    .run();
  return json(request, 200, { ok: true });
}

async function getTop(request, env, url) {
  const { results } = await env.DB
    .prepare('SELECT nick, height FROM scores WHERE height > 0 ORDER BY height DESC, updated_at ASC LIMIT ?')
    .bind(TOP_LIMIT)
    .all();
  const id = url.searchParams.get('id') ?? '';
  const me = ID_RE.test(id) ? await rankOf(env, id) : null;
  return json(request, 200, { top: results.map((r) => ({ nick: r.nick, height: r.height })), me });
}

/** Обробник з явним часом — для тестів. */
export async function handle(request, env, now) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  const url = new URL(request.url);
  try {
    if (request.method === 'POST' && url.pathname === '/score') return await postScore(request, env, now);
    if (request.method === 'POST' && url.pathname === '/nick') return await postNick(request, env, now);
    if (request.method === 'GET' && url.pathname === '/top') return await getTop(request, env, url);
  } catch {
    return json(request, 500, { error: 'server' });
  }
  return json(request, 404, { error: 'not_found' });
}

export default {
  fetch: (request, env) => handle(request, env, Date.now()),
};
