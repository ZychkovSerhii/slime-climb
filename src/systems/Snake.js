// Змійка потяга Шкодька (фідбек-6 п.18) без Phaser: шлях-ламана, по якій їде паровоз, а вагони — його слідом.
// Ряди від стіни до стіни у верхній частині екрана (гравця не зачіпають); на кінці ряду інколи — «пірнання»:
// вниз уздовж стіни до висоти гравця і назад угору сусідньою смугою. Від пірнання рятує стрибок на іншу стіну.
import { BALANCE } from '../config/balance.js';

/** Шлях: точки й накопичені довжини. */
export function createPath(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  return { points: points.slice(), cum };
}

/** Новий шлях з дописаними точками (вхід не змінює). */
export function extendPath(path, more) {
  const points = [...path.points];
  const cum = [...path.cum];
  for (const p of more) {
    const last = points[points.length - 1];
    cum.push(cum[cum.length - 1] + Math.hypot(p.x - last.x, p.y - last.y));
    points.push(p);
  }
  return { points, cum };
}

export const pathLength = (path) => path.cum[path.cum.length - 1];

/** Точка на відстані d від початку шляху і напрям руху там (кут, радіани). d поза шляхом — притискається до країв. */
export function pointAt(path, d) {
  const { points, cum } = path;
  if (points.length === 1) return { x: points[0].x, y: points[0].y, angle: 0 };
  const dd = Math.min(Math.max(d, 0), cum[cum.length - 1]);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < dd) i++;
  const a = points[i - 1];
  const b = points[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const t = (dd - cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

/**
 * Геометрія змійки для екрана: ряди (y), кінці рядів біля стін (x центру вагона), смуги пірнання.
 * carW / carH — розміри вагона на екрані; playerY — висота гравця.
 */
export function snakeLayout(width, playerY, carW, carH) {
  const T = BALANCE.shkodko.train;
  const wall = BALANCE.wallWidth;
  const rows = [];
  for (let y = T.snake.rowTop; y <= playerY - T.snake.rowBottomGap; y += T.snake.rowGap) rows.push(y);
  if (!rows.length) rows.push(T.snake.rowTop);
  const side = (s) => (s === 'left' ? wall + carH / 2 : width - wall - carH / 2); // вертикальний вагон шириною carH
  const inward = (s) => (s === 'left' ? 1 : -1) * (carH + T.snake.laneGapPx);
  return { rows, xEnd: side, xUp: (s) => side(s) + inward(s), diveY: playerY, carW };
}

/**
 * Стан генератора: де закінчився шлях (сторона, номер ряду, напрям обходу рядів) і пірнання.
 * Перша точка — далеко за лівим краєм на першому ряду, щоб увесь потяг з'являвся з-за краю.
 */
export function createSnake(layout, cars, spacing) {
  const start = { x: -cars * spacing - layout.carW, y: layout.rows[0] };
  const firstEnd = { x: layout.xEnd('right'), y: layout.rows[0] };
  return {
    path: createPath([start, firstEnd]),
    side: 'right',
    row: 0,
    rowStep: 1,
    dives: [], // { side, startD, bottomD, endD }
    headD: cars * spacing, // хвіст — у першій точці, паровоз — ще за краєм
  };
}

/** Наступний ряд (відбивається від верхнього й нижнього ряду). */
function nextRow(snake, layout) {
  const n = layout.rows.length;
  if (n === 1) return { row: 0, rowStep: 1 };
  let { rowStep } = snake;
  let row = snake.row + rowStep;
  if (row < 0 || row >= n) {
    rowStep = -rowStep;
    row = snake.row + rowStep;
  }
  return { row, rowStep };
}

/**
 * Дописує до шляху ще один відрізок: поворот (або пірнання) на кінці поточного ряду й наступний ряд до іншої стіни.
 * dive — чи пірнати на цьому кінці (вирішує виклик: час і divesClear). Повертає новий стан.
 */
export function addLeg(snake, layout, dive) {
  const { row, rowStep } = nextRow(snake, layout);
  const s = snake.side;
  const y = layout.rows[row];
  const startD = pathLength(snake.path);
  let more;
  let dives = snake.dives;
  if (dive) {
    more = [{ x: layout.xEnd(s), y: layout.diveY }, { x: layout.xUp(s), y: layout.diveY }, { x: layout.xUp(s), y }];
    const p = extendPath(snake.path, more.slice(0, 1));
    const end = extendPath(snake.path, more);
    dives = [...dives, { side: s, startD, bottomD: pathLength(p), endD: pathLength(end) }];
  } else {
    more = [{ x: layout.xEnd(s), y }];
  }
  const other = s === 'left' ? 'right' : 'left';
  more.push({ x: layout.xEnd(other), y });
  return { ...snake, path: extendPath(snake.path, more), side: other, row, rowStep, dives };
}

/**
 * Чи можна запланувати нове пірнання з точки startD: хвіст попереднього має повністю піднятися з нього
 * (інакше одна стіна зайнята старим пірнанням, а друга — новим, і сховатися нікуди).
 */
export function divesClear(dives, startD, snakeLen) {
  const last = dives[dives.length - 1];
  return !last || startD - snakeLen - BALANCE.shkodko.train.snake.diveClearPx > last.endD;
}

/** Пірнання, про яке треба попереджати зараз: паровоз ще не дійшов до низу, але вже ближче за warnPx до початку. */
export function upcomingDive(dives, headD, warnPx = BALANCE.shkodko.train.snake.warnPx) {
  return dives.find((d) => headD < d.bottomD && headD > d.startD - warnPx) ?? null;
}
