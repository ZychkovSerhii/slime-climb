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

/** Кнопка невидимості: коло в правому нижньому куті (ігрові px). */
export function invisButton(width, height) {
  return { x: width - 110, y: height - 150, r: 64 };
}

/** Чи потрапляє точка в кнопку невидимості (з невеликим запасом для пальця). */
export function inInvisButton(x, y, width, height) {
  const b = invisButton(width, height);
  return (x - b.x) ** 2 + (y - b.y) ** 2 <= (b.r + 12) ** 2;
}
