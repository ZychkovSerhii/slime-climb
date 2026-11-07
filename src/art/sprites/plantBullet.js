// Куля рослини — жовте насіння. Дрібніші пікселі (2 px), щоб вмістити контур:
// ворожий снаряд має бути найпомітнішим на екрані.
import { C } from '../palette.js';

export default {
  key: 'plantBullet',
  w: 14,
  h: 14,
  cell: 2,
  palette: { k: C.outline, y: C.seed, F: C.petal, w: C.white },
  frames: {
    seed: ['..kkk..', '.kyyyk.', 'kyywyyk', 'kyyyyyk', 'kFyyyFk', '.kFFFk.', '..kkk..'],
  },
};
