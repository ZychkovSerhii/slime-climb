// Тимчасове серце з гнилої плоті: хворобливо-зелене з темним контуром (у HUD тремтить і згасає).
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'heartRot',
  w: 32,
  h: 28,
  cell: 4,
  palette: { k: C.rotHeartDark, x: C.rotHeartDark, X: C.rotHeart, w: C.eyeSick },
  frames: {
    heartRot: outline([
      '.XX..XX.',
      'XwXXXXXX',
      'XXXXXXXx',
      '.XXXXXx.',
      '..XXXx..',
      '...Xx...',
      '........',
    ]),
  },
};
