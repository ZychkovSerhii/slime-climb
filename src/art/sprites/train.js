// Потяг Шкодька: паровоз 'loco' (невразливий, з нього визирає Шкодько) і вагон 'wagon' (має HP).
// Паровоз дивиться ліворуч (труба й фара спереду); коли їде праворуч, код віддзеркалює спрайт (flipX).
import { C } from '../palette.js';
import { outline } from '../grid.js';

const PAL = { k: C.outline, r: C.trainRed, R: C.trainRedDark, b: C.boiler, B: C.boilerDark, y: C.gold, m: C.metal, M: C.metalDark, w: C.iceLight };

const wagon = {
  key: 'wagon',
  w: 56,
  h: 40,
  cell: 4,
  palette: PAL,
  frames: {
    wagon: outline([
      '..............',
      '..............',
      '.yyyyyyyyyyyy.',
      '.rrrrrrrrrrrr.',
      '.rwwrrwwrrwwr.',
      '.rrrrrrrrrrrr.',
      '.RRRRRRRRRRRR.',
      '.MM.MkM..MkMM.',
      '...kmk...kmk..',
      '..............',
    ]),
  },
};

const loco = {
  key: 'loco',
  w: 72,
  h: 48,
  cell: 4,
  palette: PAL,
  frames: {
    loco: outline([
      '..................',
      '..................',
      '..MM..............',
      '..MM.......rrrrr..',
      '..MM.......rwwwr..',
      '.bbbbbbbbbbrwwwr..',
      'ybbbbbbbbbbrrrrr..',
      '.bBbBbBbBbbrrrrr..',
      '.BBBBBBBBBBRRRRR..',
      '.M.kmk..kmk..kmk..',
      '...kMk..kMk..kMk..',
      '..................',
    ]),
  },
};

export { wagon, loco };
