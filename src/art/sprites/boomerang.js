// Бумеранг (етап 14): дерев'яний кутик. Обертання — у коді.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'boomerang',
  w: 24,
  h: 24,
  cell: 2,
  palette: { k: C.outline, W: C.wood, D: C.woodDark, L: C.lionLight },
  frames: {
    spin: outline([
      '............',
      '.LWW........',
      '.WWWD.......',
      '.WWWD.......',
      '..DWWD......',
      '...WWWD.....',
      '....WWWWWWL.',
      '.....DWWWWW.',
      '......DDDDD.',
      '............',
      '............',
      '............',
    ]),
  },
};
