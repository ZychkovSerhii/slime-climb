// Плитка трав'яної стіни (біом 5): земля з камінцями й піском, по внутрішньому краю (праворуч) — трава зубцями. Розмір як у wall.
import { C } from '../palette.js';

export default {
  key: 'wallGrass',
  w: 60,
  h: 64,
  cell: 4,
  palette: { d: C.dirtDark, D: C.dirt, l: C.dirtLight, s: C.sand, p: C.pebble, P: C.pebbleDark, g: C.grassDark, G: C.grass, L: C.grassLight },
  frames: {
    tile: [
      'DDDdDDlDDDgGGLG',
      'DpPDDDDDsDDgGLG',
      'DPPDDdDDDDgGGGL',
      'DDDDDDDDDlDDgGL',
      'DdDDsDDDDDgGGLG',
      'DDDDDDDpDgGGGGL',
      'DlDDDDPPDDDgGGL',
      'DDDdDDDDDDDDgGG',
      'DDDDDDDDdDgGGLG',
      'DsDDDDDDDgGGGGL',
      'DDDDpDDDDlDgGGL',
      'DDDPPDDsDDDDgLG',
      'DdDDDDDDDDgGGGL',
      'DDDDDDlDDgGGGLG',
      'DDsDDDDDDDdgGGL',
      'DDDDDDDDDDDDgGG',
    ],
  },
};
