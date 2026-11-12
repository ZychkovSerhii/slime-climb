// Лавова крапля: набухає на верхньому краю стіни і стікає вниз. Притулена до внутрішнього краю лівої стіни (як шип); на правій код віддзеркалює.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'lavaDrop',
  w: 40,
  h: 48,
  cell: 4,
  palette: { k: C.outline, r: C.lavaDark, R: C.lava, E: C.lavaHot, w: C.white },
  frames: {
    swell1: outline([
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      'rrr.......',
      'rEEr......',
      'rrr.......',
      '..........',
      '..........',
    ]),
    swell2: outline([
      '..........',
      '..........',
      '..........',
      '..........',
      '..........',
      'rr........',
      'rRRr......',
      'rEERr.....',
      'rEERr.....',
      'rRRr......',
      '.rr.......',
      '..........',
    ]),
    run: outline([
      'rr........',
      'rRr.......',
      'rERr......',
      'rEERr.....',
      'rEEERr....',
      'rEEwERr...',
      'rEEwERr...',
      'rEEERRr...',
      'rREERr....',
      'rRRRr.....',
      '.rRr......',
      '..r.......',
    ]),
  },
  anims: {
    swell: { frames: ['swell1', 'swell2'], fps: 5, repeat: -1 },
  },
};
