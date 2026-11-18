// Жезл блискавки (етап 14): металеве древко з блакитним кристалом, дивиться вперед (вправо).
import { C } from '../palette.js';

export default {
  key: 'staffBolt',
  w: 44,
  h: 16,
  cell: 4,
  palette: { k: C.outline, M: C.metal, m: C.metalDark, i: C.ice, I: C.iceLight, w: C.white },
  frames: {
    hold: [
      '........kIk',
      'kkkkkkkkIwI',
      'kmMMMMMmiIi',
      'kkkkkkkkkik',
    ],
  },
};
