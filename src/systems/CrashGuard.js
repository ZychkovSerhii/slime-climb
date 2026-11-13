// Аварійний екран (фідбек-6). Phaser просить наступний кадр лише ПІСЛЯ вдалого поточного
// (node_modules/phaser/src/dom/RequestAnimationFrame.js), тож будь-який виняток у кадрі зупиняє гру назавжди:
// на екрані лишається останній кадр, тапи й «Назад» нічого не роблять. Тут: ловимо помилку, перевіряємо, що кадри
// справді стали, і показуємо текст помилки з кнопкою перезапуску. Чисті функції — з тестами.

const LAST_KEY = 'slime-climb.lastError';
const MAX_STACK_LINES = 6;
const MAX_LEN = 900;

/** Короткий текст помилки для екрана й скриншота: повідомлення + перші рядки стека без адреси сторінки. */
export function crashText(error, { maxLines = MAX_STACK_LINES } = {}) {
  const msg = String(error?.message ?? error ?? 'невідома помилка');
  const stack = String(error?.stack ?? '')
    .split('\n')
    .map((l) => l.trim().replace(/https?:\/\/[^/\s)]+\//g, ''))
    .filter((l) => l && !l.includes(msg))
    .slice(0, maxLines);
  return [msg, ...stack].join('\n').slice(0, MAX_LEN);
}

/** Чи гра стоїть: за час перевірки номер кадру не змінився. */
export function loopStalled(frameBefore, frameAfter) {
  return frameAfter === frameBefore;
}

export function saveLastError(storage, text, now = Date.now()) {
  try {
    storage?.setItem(LAST_KEY, JSON.stringify({ at: now, text }));
  } catch {
    // сховище недоступне — лишається екран
  }
}

export function loadLastError(storage) {
  try {
    const r = JSON.parse(storage?.getItem(LAST_KEY) ?? 'null');
    return r && typeof r.text === 'string' ? r : null;
  } catch {
    return null;
  }
}

const CHECK_MS = 400;

/**
 * Вмикає сторожа. frame() — номер поточного кадру гри; version — рядок версії для скриншота.
 * Помилка, після якої кадри йдуть далі (таймер, мережа), екрана не показує — лише запам'ятовується.
 */
export function installCrashGuard({ frame, version = '', win = globalThis.window, storage = null, reload = () => win.location.reload() }) {
  let shown = false;
  const show = (text) => {
    if (shown) return;
    shown = true;
    const doc = win.document;
    const root = doc.createElement('div');
    root.style.cssText =
      'position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;' +
      'background:#120808ee;color:#ffe6e6;font:16px/1.35 sans-serif;padding:24px;text-align:center';
    const h = doc.createElement('div');
    h.style.cssText = 'font-size:26px;color:#ff8a8a;font-weight:bold';
    h.textContent = 'Гра зламалась';
    const note = doc.createElement('div');
    note.textContent = 'Зроби скриншот цього екрана — за ним знайдемо причину. Рекорд і Шаги збережені.';
    const pre = doc.createElement('pre');
    pre.style.cssText = 'max-width:100%;max-height:45vh;overflow:auto;text-align:left;font:12px/1.3 monospace;background:#000a;padding:10px;border-radius:8px;white-space:pre-wrap;word-break:break-word;margin:0';
    pre.textContent = `${version}\n${text}`.trim();
    const btn = doc.createElement('button');
    btn.style.cssText = 'font:inherit;font-size:20px;color:#fff;background:#2f5a37;border:2px solid #9cff57;border-radius:10px;padding:12px 28px';
    btn.textContent = 'Перезапустити';
    btn.addEventListener('click', () => reload());
    root.append(h, note, pre, btn);
    doc.body.append(root);
  };
  const onError = (error) => {
    const text = crashText(error);
    saveLastError(storage, text);
    const before = frame();
    win.setTimeout(() => {
      if (loopStalled(before, frame())) show(text);
    }, CHECK_MS);
  };
  win.addEventListener('error', (ev) => {
    // помилки завантаження ресурсів (без ev.error і без повідомлення) гру не зупиняють
    if (ev.error || ev.message) onError(ev.error ?? ev.message);
  });
  win.addEventListener('unhandledrejection', (ev) => onError(ev.reason));
  return { isShown: () => shown };
}
