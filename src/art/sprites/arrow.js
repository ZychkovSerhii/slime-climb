// Стріла лучника (біом 5): вістрям праворуч.
import { C } from '../palette.js';

export default {
  key: 'arrow',
  w: 24,
  h: 8,
  cell: 2,
  palette: { k: C.outline, f: C.henComb, s: C.bowWood, T: C.metalLight },
  frames: {
    arrow: [
      'ff........T.',
      '.fsssssssTTT',
      'ff........T.',
    ],
  },
};
