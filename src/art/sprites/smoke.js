// Клуб диму ніндзі: з'являється (попередження) і зникає в ньому.
import { C } from '../palette.js';

export default {
  key: 'smoke',
  w: 48,
  h: 48,
  cell: 4,
  palette: { s: C.smoke, S: C.smokeLight },
  frames: {
    puff1: [
      '............',
      '....SS......',
      '...SSSS.SS..',
      '..SSssSSSSS.',
      '.SSsssssSSS.',
      '.SssssssssS.',
      'SSsssssssSS.',
      '.SSssssssS..',
      '..SSsssSSS..',
      '...SS.SSS...',
      '............',
      '............',
    ],
    puff2: [
      '.....S......',
      '..SS.SSS.S..',
      '.SSSSssSSSS.',
      'SSssssssssSS',
      'SsssssssssS.',
      '.Ssss.sssssS',
      'SSsss.ssssSS',
      'Sssssssss.S.',
      '.SSssssssSS.',
      '..SSS.SSSS..',
      '...S....S...',
      '............',
    ],
  },
  anims: { puff: { frames: ['puff1', 'puff2'], fps: 8, repeat: -1 } },
};
