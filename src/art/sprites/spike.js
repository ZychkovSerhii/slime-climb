// Шип вістрям праворуч (для правої стіни віддзеркалюється).
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'spike',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, j: C.metalDark, i: C.metal, I: C.metalLight },
  frames: {
    spike: outline([
      'j.........',
      'jII.......',
      'jiIII.....',
      'jiiiIII...',
      'jiiiiiIIIk',
      'jjjjjjjjjk',
      'jjjjjjk...',
      'jjjjk.....',
      'jjk.......',
      'j.........',
    ]),
  },
};
