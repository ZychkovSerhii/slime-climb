// Лавова крапля: набухає на верхньому краю стіни і стікає вниз. Біля внутрішнього краю лівої стіни; на правій код віддзеркалює.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'lavaDrop',
  w: 24,
  h: 32,
  cell: 4,
  palette: { k: C.outline, r: C.lavaDark, R: C.lava, E: C.lavaHot },
  frames: {
    swell1: outline([
      '......',
      '......',
      '.rr...',
      'rEEr..',
      '.rr...',
      '......',
      '......',
      '......',
    ]),
    swell2: outline([
      '......',
      '.rr...',
      'rEEr..',
      'rEEr..',
      '.rRr..',
      '..r...',
      '......',
      '......',
    ]),
    run: outline([
      '.rr...',
      'rEEr..',
      'rEEr..',
      'rEEr..',
      'rEEr..',
      '.rEr..',
      '.rEr..',
      '..r...',
    ]),
  },
  anims: {
    swell: { frames: ['swell1', 'swell2'], fps: 5, repeat: -1 },
  },
};
