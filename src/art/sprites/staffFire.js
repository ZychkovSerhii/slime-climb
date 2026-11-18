// Вогняний жезл (етап 14): дерев'яне древко з жаринкою-навершям, дивиться вперед (вправо).
import { C } from '../palette.js';

export default {
  key: 'staffFire',
  w: 44,
  h: 16,
  cell: 4,
  palette: { k: C.outline, W: C.wood, D: C.woodDark, r: C.lavaDark, o: C.lava, y: C.lavaHot },
  frames: {
    hold: [
      '........kok',
      'kkkkkkkkoyo',
      'kDWWWWWDryr',
      'kkkkkkkkkok',
    ],
  },
};
