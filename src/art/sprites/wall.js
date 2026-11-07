// Плитка стіни (тайлиться по вертикалі). Внутрішній край праворуч, права стіна віддзеркалюється.
// Цегла збирається з рядків-шаблонів, тож її легко перемалювати або поміняти розмір.
import { C } from '../palette.js';

const A_TOP = 'hhhhhhshhhhhh';
const A_MID = 'SSSSSSsSSSSSS';
const MORTAR = 'sssssssssssss';
const B_TOP = 'hhshhhhhhhshh';
const B_MID = 'SSsSSSSSSSsSS';
const BRICKS = [A_TOP, A_MID, A_MID, MORTAR, B_TOP, B_MID, B_MID, MORTAR, A_TOP, A_MID, A_MID, MORTAR, B_TOP, B_MID, B_MID, MORTAR];
// два стовпчики внутрішнього краю: мох і смуга слизу
const EDGE_MOSS = 'mMmsmMMmsmMmmMsm';
const EDGE_OOZE = 'ooLookooooLookoo';
// моху трохи на цеглі: рядок → стовпчики
const MOSS_SPOTS = { 1: [3], 5: [8, 9], 9: [1], 13: [5] };

const tile = BRICKS.map((row, y) => {
  const cells = [...row];
  for (const x of MOSS_SPOTS[y] ?? []) cells[x] = 'm';
  return cells.join('') + EDGE_MOSS[y] + EDGE_OOZE[y];
});

export default {
  key: 'wall',
  w: 60,
  h: 64,
  cell: 4,
  palette: { k: C.outline, s: C.stoneDark, S: C.stone, h: C.stoneLight, m: C.moss, M: C.mossLight, o: C.ooze, L: C.slimeLight },
  frames: { tile },
};
