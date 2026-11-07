// Хижа рослина на стіні, паща праворуч (на правій стіні віддзеркалюється). Кадри: закрита / постріл.
import { C } from '../palette.js';

export default {
  key: 'plant',
  w: 44,
  h: 44,
  cell: 4,
  palette: { k: C.outline, v: C.leafDark, V: C.leaf, M: C.mossLight, f: C.petalDark, F: C.petal, t: C.tooth, R: C.mouth, w: C.white },
  frames: {
    idle: [
      '...........',
      '....kkkk...',
      '...kfFFfk..',
      '..kfFFFFfk.',
      '..kfFwFFFfk',
      'VVkkkkkktkk',
      'MVkfFFFFFfk',
      'VvkfFFFFfk.',
      'MV.kfffk...',
      '.VV.kkk....',
      'MVv........',
    ],
    shoot: [
      '...........',
      '...kkkkk...',
      '..kfFFFfkk.',
      '..kfFwFfftk',
      'VVkfFFFkk..',
      'MVkfFkRRR..',
      'VvkfFFFkk..',
      'VvkfFFfftk.',
      'MV.kfffkk..',
      '.VV.kkk....',
      'MVv........',
    ],
  },
  anims: {
    idle: { frames: ['idle'], fps: 1 },
    shoot: { frames: ['shoot', 'shoot', 'shoot'], fps: 8 },
  },
};
