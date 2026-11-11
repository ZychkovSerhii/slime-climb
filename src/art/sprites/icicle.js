// Бурулька — шип зимових стін (той самий розмір і форма хітбокса, що spike). Вістрям праворуч.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'icicle',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, j: C.iceDark, i: C.ice, I: C.iceLight, w: C.snow },
  frames: {
    icicle: outline([
      'w.........',
      'wII.......',
      'jiIIw.....',
      'jiiiIIw...',
      'jiiiiiIIwk',
      'jjjjjiiiik',
      'jjjjjik...',
      'jjjjk.....',
      'jjk.......',
      'w.........',
    ]),
  },
};
