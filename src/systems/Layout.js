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
