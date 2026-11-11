// Довідник (етап 7): HTML-шар поверх гри, а не Phaser-сцена.
// Чому HTML: пошук з клавіатурою, прокрутка й сортування у DOM працюють нативно (на телефоні теж),
// а окрема сторінка codex.html перезапускала б Phaser і вимагала б окремої обробки «Назад» на Android.
// Дані — src/systems/Codex.js (чисті функції). Тут лише відмальовка.
import { buildCodex, BIOMES, CATEGORIES, queryCodex, SORTS } from '../systems/Codex.js';
import { SPRITES } from '../art/sprites/index.js';
import { frameNames, gridOrigin } from '../art/grid.js';
import { paintGrid } from '../art/paint.js';
import { PNG_OVERRIDES } from '../art/overrides.js';

const ICON = 64; // px CSS, квадрат під спрайт
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const SPRITE_BY_KEY = new Map(SPRITES.map((s) => [s.key, s]));

const CSS = `
.codex{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;background:#0b1610;color:#e6f2e6;
  font:16px/1.35 sans-serif;touch-action:pan-y;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.codex[hidden]{display:none}
.codex-head{padding:10px 12px 8px;display:flex;flex-direction:column;gap:8px;border-bottom:2px solid #24402a}
.codex-row{display:flex;gap:8px;align-items:center}
.codex h1{margin:0;font-size:24px;color:#9cff57;flex:1}
.codex button,.codex select,.codex input{font:inherit;color:inherit;background:#1a2a1e;border:2px solid #2f5a37;border-radius:8px;padding:8px 10px}
.codex input{flex:1;min-width:0}
.codex select{flex:1;min-width:0}
.codex-close{color:#cfe8cf}
.codex-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 10px 24px;display:flex;flex-direction:column;gap:8px}
.codex-item{display:flex;gap:12px;background:#132018;border:2px solid #24402a;border-radius:10px;padding:10px}
.codex-icon{flex:0 0 ${ICON}px;height:${ICON}px;display:flex;align-items:center;justify-content:center;background:#0b1610;border-radius:8px}
.codex-icon canvas,.codex-icon img{image-rendering:pixelated;max-width:${ICON}px;max-height:${ICON}px}
.codex-icon span{font-size:28px;color:#9cff57}
.codex-body{flex:1;min-width:0}
.codex-name{font-weight:bold;font-size:18px;color:#ffffff}
.codex-tags{font-size:13px;color:#9fbfa4;margin:2px 0 4px}
.codex-stats{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.codex-stats b{font-weight:normal;font-size:13px;background:#24402a;border-radius:6px;padding:1px 6px;color:#ffd84a}
.codex-facts{margin:4px 0 0;padding-left:18px;font-size:14px;color:#cfe8cf}
.codex-empty{text-align:center;color:#9fbfa4;padding:32px}
`;

/** Перший кадр спрайта: canvas з сітки, або PNG-заміна, якщо вона є (src/art/png/<key>.png). */
function spriteIcon(key) {
  const sprite = SPRITE_BY_KEY.get(key);
  if (!sprite || sprite.draw) return null; // намальовані кодом Phaser (тінь) — у довіднику не потрібні
  const k = Math.min(ICON / sprite.w, ICON / sprite.h);
  const canvas = document.createElement('canvas');
  canvas.width = sprite.w;
  canvas.height = sprite.h;
  canvas.style.width = `${Math.round(sprite.w * k)}px`;
  canvas.style.height = `${Math.round(sprite.h * k)}px`;
  const ctx = canvas.getContext('2d');
  const png = PNG_OVERRIDES[key];
  if (png) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
    img.src = png;
    return canvas;
  }
  // адаптер під API Phaser.Graphics, яке чекає paintGrid
  const g = {
    fillStyle: (c, a = 1) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = hex(c);
    },
    fillRect: (x, y, w, h) => ctx.fillRect(x, y, w, h),
  };
  const rows = sprite.frames[frameNames(sprite)[0]];
  const o = gridOrigin(sprite, rows);
  paintGrid(g, rows, sprite.palette, { x: o.x, y: o.y, cell: sprite.cell });
  return canvas;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function renderItem(e, catName) {
  const item = el('article', 'codex-item');
  const icon = el('div', 'codex-icon');
  const pic = e.sprite ? spriteIcon(e.sprite) : null;
  icon.append(pic ?? el('span', null, e.name[0]));
  const body = el('div', 'codex-body');
  body.append(el('div', 'codex-name', e.name));
  body.append(el('div', 'codex-tags', [catName, e.biome ? BIOMES[e.biome] : null].filter(Boolean).join(' · ')));
  const stats = el('div', 'codex-stats');
  const num = (x) => String(x).replace('.', ',');
  if (e.hp != null) stats.append(el('b', null, `HP ${num(e.hp)}`));
  if (e.damage != null) stats.append(el('b', null, `Шкода ${num(e.damage)}`));
  if (e.speed != null) stats.append(el('b', null, `Швидкість ${e.speed}`));
  if (stats.childElementCount) body.append(stats);
  body.append(el('div', null, e.desc));
  if (e.facts.length) {
    const ul = el('ul', 'codex-facts');
    for (const f of e.facts) ul.append(el('li', null, f));
    body.append(ul);
  }
  item.append(icon, body);
  return item;
}

function option(value, label) {
  const o = el('option', null, label);
  o.value = value;
  return o;
}

/** Створює (один раз) шар довідника. Повертає { open, close, isOpen }. */
export function createCodex(parent = document.body) {
  const style = el('style');
  style.textContent = CSS;
  document.head.append(style);

  const root = el('section', 'codex');
  root.hidden = true;
  root.setAttribute('aria-label', 'Довідник');
  const head = el('div', 'codex-head');
  const row1 = el('div', 'codex-row');
  const close = el('button', 'codex-close', '← Назад');
  row1.append(el('h1', null, 'Довідник'), close);
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Пошук за назвою';
  search.enterKeyHint = 'search';
  const row2 = el('div', 'codex-row');
  row2.append(search);
  const cat = el('select');
  cat.setAttribute('aria-label', 'Категорія');
  cat.append(option('all', 'Усі категорії'), ...CATEGORIES.map((c) => option(c.id, c.name)));
  const sort = el('select');
  sort.setAttribute('aria-label', 'Сортування');
  sort.append(...SORTS.map((s) => option(s.id, `Сорт.: ${s.name}`)));
  const row3 = el('div', 'codex-row');
  row3.append(cat, sort);
  head.append(row1, row2, row3);
  const list = el('div', 'codex-list');
  root.append(head, list);
  parent.append(root);

  const entries = buildCodex();
  const catNames = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
  const render = () => {
    const found = queryCodex(entries, { query: search.value, category: cat.value, sort: sort.value });
    list.replaceChildren(...(found.length ? found.map((e) => renderItem(e, catNames[e.category])) : [el('div', 'codex-empty', 'Нічого не знайдено')]));
  };
  search.addEventListener('input', render);
  cat.addEventListener('change', render);
  sort.addEventListener('change', render);
  // клавіші не мають доходити до Phaser (пробіл/стрілки в меню)
  root.addEventListener('keydown', (ev) => ev.stopPropagation());

  let onClose = null;
  const api = {
    isOpen: () => !root.hidden,
    open(closed) {
      onClose = closed ?? null;
      render();
      root.hidden = false;
      list.scrollTop = 0;
    },
    close() {
      if (root.hidden) return;
      search.blur();
      root.hidden = true;
      onClose?.();
    },
  };
  close.addEventListener('click', () => api.close());
  return api;
}
