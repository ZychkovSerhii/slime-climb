// Прокрутка списку пальцем — чиста логіка без Phaser (тести: tests/scrollList.test.js).

/** Тап, а не протягування: палець зсунувся менше за цю відстань (px гри). */
export const TAP_SLOP = 14;

/** Найбільша прокрутка: 0, якщо все влазить. */
export function maxScroll(contentH, viewH) {
  return Math.max(0, contentH - viewH);
}

/** Прокрутка в межах [0, maxScroll]. */
export function clampScroll(scroll, contentH, viewH) {
  if (!Number.isFinite(scroll)) return 0;
  return Math.min(Math.max(0, scroll), maxScroll(contentH, viewH));
}

/** Палець пройшов від натискання далі за TAP_SLOP — це протягування, тап скасовується. */
export function isDrag(downY, y) {
  return Math.abs(y - downY) > TAP_SLOP;
}
