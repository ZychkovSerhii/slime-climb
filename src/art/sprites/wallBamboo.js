// Плитка бамбукової стіни (етап 9). Як wall.js: тайлиться по вертикалі, внутрішній край праворуч, права стіна віддзеркалюється.
// Той самий розмір, що в wall — стіни міняються без зміни хітбоксів. Три стебла з колінцями на різній висоті.
import { C } from '../palette.js';

const STALK = 'dbbL'; // тінь, стебло, стебло, відблиск
const NODE = 'nnnn'; // колінце
// стебло → рядок колінця (у плитці 16 рядків)
const NODES = [3, 11, 7];
const GAP = 's';
// внутрішній край: листя й темна смуга
const EDGE_LEAF = 'lsLlsslLlslLssll';
const EDGE_DARK = 'ssdssdssssdsssds';

const tile = Array.from({ length: 16 }, (_, y) => {
  const stalks = NODES.map((n) => (y === n ? NODE : STALK)).join('');
  return stalks + GAP + EDGE_LEAF[y] + EDGE_DARK[y];
});

export default {
  key: 'wallBamboo',
  w: 60,
  h: 64,
  cell: 4,
  palette: { s: C.bambooNode, d: C.bambooDark, b: C.bamboo, L: C.bambooLight, n: C.bambooNode, l: C.leafBamboo },
  frames: { tile },
};
