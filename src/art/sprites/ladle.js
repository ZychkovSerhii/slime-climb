// Трофей «Черпачок»: кружляє довкола слизака і хлюпає лавою.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'ladle',
  w: 24,
  h: 24,
  cell: 4,
  palette: { k: C.outline, i: C.ironLight, R: C.iron, E: C.lavaHot },
  frames: {
    ladle: outline([
      '.....i',
      '....i.',
      '...i..',
      'RRR...',
      'RER...',
      '.R....',
    ]),
  },
};
