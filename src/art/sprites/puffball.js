// Пшикач (біом 5): гриб-дощовик із сердитими очима. Кадр swell — роздувся перед вибухом.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'puffball',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, p: C.puffDark, P: C.puff, s: C.puffSpot, e: C.outline, d: C.dirt },
  frames: {
    idle: outline([
      '..........',
      '...pppp...',
      '..pPPPPp..',
      '.pPPsPPPp.',
      '.pPePPePp.',
      '.pPsPPPPp.',
      '..pPPPPp..',
      '...pddp...',
      '....dd....',
      '..........',
    ]),
    swell: outline([
      '..........',
      '..pppppp..',
      '.pPPPPPPp.',
      'pPPPsPPPPp',
      'pPPePPePPp',
      'pPPsPPPsPp',
      '.pPPPPPPp.',
      '..ppddpp..',
      '....dd....',
      '..........',
    ]),
  },
  anims: {
    hiss: { frames: ['idle', 'swell'], fps: 10, repeat: -1 },
  },
};
