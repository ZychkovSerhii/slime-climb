// Базальтовий кілок — шип лавових стін (розмір і хітбокс як spike). Вістрям праворуч, гребінь жевріє.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'basalt',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, j: C.basalt, i: C.basaltSpike, I: C.lavaHot },
  frames: {
    basalt: outline([
      'j.........',
      'jjI.......',
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
