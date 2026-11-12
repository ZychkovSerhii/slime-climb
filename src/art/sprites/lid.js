// Кришка Казана: летить бумерангом через коридор.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'lid',
  w: 48,
  h: 20,
  cell: 4,
  palette: { k: C.outline, h: C.ironLight, H: C.iron, i: C.ironDark },
  frames: {
    lid: outline([
      '.....hh.....',
      '..hhhhhhhh..',
      'HHHHHHHHHHHH',
      '.iiiiiiiiii.',
      '............',
    ]),
  },
};
