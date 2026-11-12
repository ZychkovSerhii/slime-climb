// Шар «Лідери» (етап 12): HTML поверх гри, як довідник (src/codex) — бо потрібне поле вводу ніка,
// а в Phaser на Android нормального текстового вводу немає. Логіка — src/systems/Leaderboard.js.
import { LEADERBOARD_URL, REQUEST_TIMEOUT_MS } from '../config/leaderboard.js';
import { fetchTop, flush, loadNick, playerId, sendNick } from '../systems/Leaderboard.js';
import { NICK_MAX, validateNick } from '../systems/LeaderboardRules.js';
import { browserStorage } from '../systems/HighScore.js';

const CSS = `
.lb{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;background:#0b1610;color:#e6f2e6;
  font:16px/1.35 sans-serif;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.lb[hidden]{display:none}
.lb-head{padding:10px 12px 8px;display:flex;flex-direction:column;gap:8px;border-bottom:2px solid #24402a}
.lb-row{display:flex;gap:8px;align-items:center}
.lb h1{margin:0;font-size:24px;color:#9cff57;flex:1}
.lb button,.lb input{font:inherit;color:inherit;background:#1a2a1e;border:2px solid #2f5a37;border-radius:8px;padding:8px 10px}
.lb input{flex:1;min-width:0}
.lb-err{font-size:14px;color:#ff8a8a;min-height:1.2em}
.lb-err.ok{color:#9cff57}
.lb-err.hint{color:#cfe8cf}
.lb-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 10px 24px;display:flex;flex-direction:column;gap:4px}
.lb-item{display:flex;gap:10px;background:#132018;border:2px solid #24402a;border-radius:10px;padding:8px 10px}
.lb-item.me{border-color:#ffd84a;background:#2a2a12}
.lb-rank{flex:0 0 2.5em;color:#9fbfa4;text-align:right}
.lb-nick{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lb-h{color:#ffd84a}
.lb-note{text-align:center;color:#9fbfa4;padding:24px 12px}
`;

const ERRORS = {
  short: 'Щонайменше 3 символи',
  long: `Не більше ${NICK_MAX}`,
  chars: 'Лише літери, цифри, пробіл, _ - .',
  profane: 'Обери інший нік',
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text; // нік — лише textContent, не innerHTML
  return e;
}

function row(rank, nick, height, isMe) {
  const r = el('div', isMe ? 'lb-item me' : 'lb-item');
  r.append(el('span', 'lb-rank', String(rank)), el('span', 'lb-nick', nick), el('span', 'lb-h', String(height)));
  return r;
}

/** Створює (один раз) шар «Лідери». Повертає { open, close, isOpen }. */
export function createLeaderboard(parent = document.body, { url = LEADERBOARD_URL, storage = browserStorage() } = {}) {
  const net = { url, timeoutMs: REQUEST_TIMEOUT_MS };
  const style = el('style');
  style.textContent = CSS;
  document.head.append(style);

  const root = el('section', 'lb');
  root.hidden = true;
  root.setAttribute('aria-label', 'Лідери');
  const head = el('div', 'lb-head');
  const close = el('button', null, '← Назад');
  const row1 = el('div', 'lb-row');
  row1.append(el('h1', null, 'Лідери'), close);
  const input = el('input');
  input.maxLength = NICK_MAX;
  input.placeholder = 'Твій нік';
  input.autocomplete = 'off';
  input.enterKeyHint = 'done';
  const save = el('button', null, 'Зберегти');
  const row2 = el('div', 'lb-row');
  row2.append(input, save);
  const err = el('div', 'lb-err');
  head.append(row1, row2, err);
  const list = el('div', 'lb-list');
  root.append(head, list);
  parent.append(root);
  root.addEventListener('keydown', (ev) => ev.stopPropagation());

  const note = (text, retry) => {
    const n = el('div', 'lb-note', text);
    if (retry) {
      const b = el('button', null, 'Спробувати ще');
      b.style.marginTop = '12px';
      b.addEventListener('click', () => refresh());
      n.append(el('br'), b);
    }
    list.replaceChildren(n);
  };

  let seq = 0; // відповідь на застарілий запит (шар закрили / оновили) не малює
  async function refresh() {
    const my = ++seq;
    if (!net.url) return note('Таблиця ще не підключена');
    note('Завантаження…');
    await flush(storage, net);
    const r = await fetchTop(storage, net);
    if (my !== seq || root.hidden) return;
    if (r.status !== 'ok') return note("Немає зв'язку", true);
    if (!r.top.length) return note('Поки порожньо. Зіграй на «Нормі» — і будеш першим!');
    const me = r.me;
    const rows = r.top.map((t, i) => row(i + 1, t.nick, t.height, me && me.rank === i + 1));
    if (me && me.rank > r.top.length) rows.push(el('div', 'lb-note', '…'), row(me.rank, loadNick(storage) ?? 'Ти', me.height, true));
    list.replaceChildren(...rows);
  }

  async function saveNick() {
    const v = validateNick(input.value);
    if (!v.ok) {
      err.className = 'lb-err';
      err.textContent = ERRORS[v.error];
      return;
    }
    input.value = v.nick;
    save.disabled = true;
    const r = await sendNick(storage, v.nick, net);
    save.disabled = false;
    err.className = r === 'invalid' ? 'lb-err' : 'lb-err ok';
    err.textContent = { ok: 'Збережено', disabled: 'Збережено', offline: 'Збережено на телефоні — надішлемо пізніше', invalid: ERRORS.profane }[r];
    if (r !== 'invalid') refresh();
  }
  save.addEventListener('click', saveNick);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') saveNick();
  });

  let onClose = null;
  const api = {
    isOpen: () => !root.hidden,
    /** focusNick — одразу поставити курсор у поле (перша відправка без ніка). */
    open({ focusNick = false, closed } = {}) {
      onClose = closed ?? null;
      playerId(storage);
      input.value = loadNick(storage) ?? '';
      err.className = 'lb-err hint';
      err.textContent = loadNick(storage) ? '' : 'Введи нік, щоб потрапити в таблицю';
      root.hidden = false;
      list.scrollTop = 0;
      refresh();
      if (focusNick) input.focus();
    },
    close() {
      if (root.hidden) return;
      seq++;
      input.blur();
      root.hidden = true;
      onClose?.();
    },
  };
  close.addEventListener('click', () => api.close());
  return api;
}
