// Іскра (лава): летить зигзагом; убита — розпадається на дрібні sparkling.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'spark',
  w: 24,
  h: 24,
  cell: 4,
  palette: { k: C.outline, r: C.lavaDark, R: C.lava, E: C.lavaHot, w: C.white },
  frames: {
    fly1: outline([
      '..r...',
      '.rER..',
      'rEwER.',
      '.REEr.',
      '..Rr..',
      '......',
    ]),
    fly2: outline([
      '...r..',
      '..REr.',
      '.rEwEr',
      '..EER.',
      '..rR..',
      '......',
    ]),
  },
  anims: {
    fly: { frames: ['fly1', 'fly2'], fps: 8, repeat: -1 },
  },
};
