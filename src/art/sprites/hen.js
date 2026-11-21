// Курка (біом 5): руда рябенька курка з великим гребенем — на ній їздить Мрець-Велетень з 40% HP. Дзьобом праворуч.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'hen',
  w: 64,
  h: 56,
  cell: 4,
  palette: { k: C.outline, h: C.henBrown, H: C.henLight, l: C.henBrown, r: C.henComb, y: C.beak, e: C.outline },
  frames: {
    run1: outline([
      '..........rr....',
      '.........rrrr...',
      '.........hHHh...',
      '........hHHeHyy.',
      '........hHHHHyy.',
      '.hh.....hHHHr...',
      'hHHh...hHHHHr...',
      'hHHHhhhHHHHHh...',
      'hHlHHHHHlHHHh...',
      '.hHHHlHHHHHh....',
      '..hHHHHHHHh.....',
      '....hhhhh.......',
      '.....y..y.......',
      '....yy.yy.......',
    ]),
    run2: outline([
      '..........rr....',
      '.........rrrr...',
      '.........hHHh...',
      '........hHHeHyy.',
      '........hHHHHyy.',
      '.hh.....hHHHr...',
      'hHHh...hHHHHr...',
      'hHHHhhhHHHHHh...',
      'hHlHHHHHlHHHh...',
      '.hHHHlHHHHHh....',
      '..hHHHHHHHh.....',
      '....hhhhh.......',
      '.....y...y......',
      '....yy...yy.....',
    ]),
  },
  anims: {
    run: { frames: ['run1', 'run2'], fps: 10, repeat: -1 },
  },
};
