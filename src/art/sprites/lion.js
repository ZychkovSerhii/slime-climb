// Левиця боком, мордою праворуч (у грі повертається кодом Lion.js). Контур додається автоматично.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const BODY = [
  '..............',
  '.........dd...',
  '........bbbbb.',
  '........bBebbb',
  'n.......bbbbbn',
  '.d.BBBBBbbbbb.',
  '..bbbbbbbbbb..',
  '..bbbbbbbbb...',
  '..dbbbbbbbd...',
];
const EMPTY_ROWS = ['..............', '..............'];

export default {
  key: 'lion',
  w: 56,
  h: 56,
  cell: 4,
  palette: { k: C.outline, b: C.lionFur, d: C.lionShade, B: C.lionLight, e: C.outline, n: C.lionNose, w: C.white, q: C.lionMouth },
  frames: {
    run1: outline([...BODY, '..bd.....db...', '..b.......b...', '.dd......dd...', ...EMPTY_ROWS]),
    run2: outline([...BODY, '...bd...bd....', '...b.....b....', '...dd....dd...', ...EMPTY_ROWS]),
    bite: outline([
      '.........dd...',
      '........bbbbb.',
      '........bBebbb',
      'n.......bbbbww',
      '.d.BBBBBbbbq..',
      '..bbbbbbbbbbww',
      '..bbbbbbbbbb..',
      '.db.......bd..',
      '.b.........bd.',
      '............d.',
      '..............',
      '..............',
      '..............',
      '..............',
    ]),
  },
  anims: {
    run: { frames: ['run1', 'run2'], fps: 8, repeat: -1 },
    bite: { frames: ['bite'], fps: 1 },
  },
};
