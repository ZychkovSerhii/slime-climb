// Дробовик Хулігана: обріз із дерев'яним прикладом, ствол дивиться вперед (вправо).
import { C } from '../palette.js';

export default {
  key: 'shotgun',
  w: 40,
  h: 16,
  cell: 4,
  palette: { k: C.outline, L: C.metalLight, M: C.metal, W: C.wood, D: C.woodDark },
  frames: {
    hold: [
      'kkkkkkkk..',
      'kDWWMMMMLk',
      'kDDWkkkkkk',
      'kDDk......',
    ],
  },
};
