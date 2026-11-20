// Вікно «Що нового» (фідбек-8): HTML-шар поверх меню, як довідник і «Лідери» — довгий список зручно гортати пальцем.
import { PATCH_NOTES } from '../config/patchNotes.js';

const CSS = `
.pn{position:fixed;inset:0;z-index:21;display:flex;align-items:center;justify-content:center;background:rgba(5,10,7,.82);
  font:16px/1.4 sans-serif;color:#e6f2e6;padding:calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px)}
.pn[hidden]{display:none}
.pn-box{width:100%;max-width:560px;max-height:100%;display:flex;flex-direction:column;background:#0b1610;
  border:3px solid #2f5a37;border-radius:14px}
.pn h1{margin:0;padding:12px 14px 8px;font-size:24px;color:#9cff57;border-bottom:2px solid #24402a}
.pn-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 14px}
.pn h2{font-size:18px;color:#ffd84a;margin:12px 0 6px}
.pn ul{margin:0;padding-left:20px}
.pn li{margin:4px 0}
.pn button{font:inherit;font-size:20px;color:inherit;background:#1a2a1e;border:2px solid #2f5a37;border-radius:10px;
  padding:10px;margin:10px 14px 14px}
`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Створює (один раз) шар «Що нового». Повертає { open(onClose), close, isOpen }. */
export function createPatchNotes(parent = document.body, notes = PATCH_NOTES) {
  const style = el('style');
  style.textContent = CSS;
  document.head.append(style);
  const root = el('section', 'pn');
  root.hidden = true;
  root.setAttribute('aria-label', 'Що нового');
  const box = el('div', 'pn-box');
  const list = el('div', 'pn-list');
  for (const n of notes) {
    list.append(el('h2', null, n.title));
    const ul = el('ul');
    for (const item of n.items) ul.append(el('li', null, item));
    list.append(ul);
  }
  const ok = el('button', null, 'Зрозуміло');
  box.append(el('h1', null, 'Що нового'), list, ok);
  root.append(box);
  parent.append(root);
  // тап по шару не має «протікати» в Phaser (старт гри)
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'keydown']) root.addEventListener(ev, (e) => e.stopPropagation());

  let onClose = null;
  const close = () => {
    if (root.hidden) return;
    root.hidden = true;
    const cb = onClose;
    onClose = null;
    cb?.();
  };
  ok.addEventListener('click', close);
  return {
    open(cb) {
      onClose = cb ?? null;
      list.scrollTop = 0;
      root.hidden = false;
    },
    close,
    isOpen: () => !root.hidden,
  };
}
