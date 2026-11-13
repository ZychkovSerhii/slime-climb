/** "24px" → 24; порожнє чи сміття → 0. */
export function parseCssPx(value) {
  const n = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Відступ безпечної зони (виріз камери) в ігрових px.
 * insetCssPx — відступ у CSS px, cssHeight — висота канвасу в CSS px, gameHeight — висота гри в ігрових px.
 */
export function safeTopGamePx(insetCssPx, cssHeight, gameHeight) {
  if (!(insetCssPx > 0) || !(cssHeight > 0)) return 0;
  return (insetCssPx * gameHeight) / cssHeight;
}

/** Кнопка паузи (фідбек-6): квадрат у правому верхньому куті; top — верх HUD з урахуванням вирізу камери (ігрові px). */
export const PAUSE_BUTTON_SIZE = 64;
export function pauseButton(width, top) {
  return { x: width - 24 - PAUSE_BUTTON_SIZE / 2, y: top + PAUSE_BUTTON_SIZE / 2, size: PAUSE_BUTTON_SIZE };
}

/** Чи потрапляє точка в кнопку паузи (із запасом для пальця: кут екрана зараховується весь). */
export function inPauseButton(x, y, width, top) {
  const b = pauseButton(width, top);
  const m = 16;
  return x >= b.x - b.size / 2 - m && y <= b.y + b.size / 2 + m;
}

/** Кнопка невидимості: коло в правому нижньому куті (ігрові px). */
export function invisButton(width, height) {
  return { x: width - 110, y: height - 150, r: 64 };
}

/** Чи потрапляє точка в кнопку невидимості (з невеликим запасом для пальця). */
export function inInvisButton(x, y, width, height) {
  const b = invisButton(width, height);
  return (x - b.x) ** 2 + (y - b.y) ** 2 <= (b.r + 12) ** 2;
}
