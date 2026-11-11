// Плитка крижаної стіни (зима). Як wall.js: тайлиться по вертикалі, внутрішній край праворуч, права стіна віддзеркалюється.
// Той самий розмір, що в wall — стіни міняються без зміни хітбоксів.
import { C } from '../palette.js';

const A_TOP = 'hhhhhhIhhhhhh';
const A_MID = 'IIIIIIiIIIIII';
const SEAM = 'iiiiiiiiiiiii';
const B_TOP = 'hhIhhhhhhhIhh';
const B_MID = 'IIiIIIIIIIiII';
const BLOCKS = [A_TOP, A_MID, A_MID, SEAM, B_TOP, B_MID, B_MID, SEAM, A_TOP, A_MID, A_MID, SEAM, B_TOP, B_MID, B_MID, SEAM];
// внутрішній край: сніг і бурулька-смуга
const EDGE_SNOW = 'wWwwWwwwWwwWwwWw';
const EDGE_ICE = 'hhwhhhhwhhhhwhhh';
// тріщинки в льоду: рядок → стовпчики
const CRACKS = { 2: [4], 6: [9], 10: [2], 14: [7] };

const tile = BLOCKS.map((row, y) => {
  const cells = [...row];
  for (const x of CRACKS[y] ?? []) cells[x] = 'w';
  return cells.join('') + EDGE_ICE[y] + EDGE_SNOW[y];
});

export default {
  key: 'wallIce',
  w: 60,
  h: 64,
  cell: 4,
  palette: { i: C.wallIceDark, I: C.wallIce, h: C.wallIceLight, w: C.snow, W: C.snowShade },
  frames: { tile },
};
