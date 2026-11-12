// Саламандра (лава): вилазить із тріщини стіни й дихає вогнем через коридор. Дивиться праворуч, на правій стіні код віддзеркалює.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'salamander',
  w: 48,
  h: 32,
  cell: 4,
  palette: { k: C.outline, s: C.salamanderDark, S: C.salamander, e: C.white, t: C.salamanderDark, l: C.salamanderDark, m: C.lavaHot },
  frames: {
    emerge: outline([
      '............',
      '............',
      '............',
      '..........e.',
      '.........SSs',
      '........sSS.',
      '.........l..',
      '............',
    ]),
    idle: outline([
      '............',
      '......ss....',
      '.....sSSs.e.',
      'tt.sSSSSSSSs',
      '.tsSSSSSSSS.',
      '..sSSSSSSs..',
      '..l.l..l.l..',
      '............',
    ]),
    breathe: outline([
      '............',
      '......ss....',
      '.....sSSs.e.',
      'tt.sSSSSSSSm',
      '.tsSSSSSSSSm',
      '..sSSSSSSs..',
      '..l.l..l.l..',
      '............',
    ]),
  },
  anims: {
    idle: { frames: ['idle'], fps: 1 },
    breathe: { frames: ['breathe', 'idle'], fps: 8, repeat: -1 },
  },
};
