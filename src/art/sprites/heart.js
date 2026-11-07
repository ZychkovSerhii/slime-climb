// Серце в HUD.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'heart',
  w: 32,
  h: 28,
  cell: 4,
  palette: { k: C.outline, x: C.heartDark, X: C.heart, w: C.white },
  frames: {
    heart: outline(['.XX..XX.', 'XwXXXXXX', 'XXXXXXXx', '.XXXXXx.', '..XXXx..', '...Xx...', '........']),
  },
};
