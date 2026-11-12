// Бамбуковий кілок — шип бамбукових стін (той самий розмір і форма хітбокса, що spike). Вістрям праворуч, зріз світлий.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'stake',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, j: C.stakeDark, i: C.stake, I: C.stakeLight },
  frames: {
    stake: outline([
      'j.........',
      'jII.......',
      'jiiII.....',
      'jjiiiII...',
      'jiiiiiiIIk',
      'jjjjjjiiik',
      'jjiijjk...',
      'jjjjk.....',
      'jjk.......',
      'j.........',
    ]),
  },
};
