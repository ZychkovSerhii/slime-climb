// Бульбашка кипіння Казана: пливе до гравця і лопається.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'bubble',
  w: 28,
  h: 28,
  cell: 4,
  palette: { k: C.outline, r: C.lava, R: C.lavaDark, E: C.white },
  frames: {
    bubble: outline([
      '.......',
      '..rrr..',
      '.rE.Rr.',
      '.r...r.',
      '.R...r.',
      '..rrr..',
      '.......',
    ]),
  },
};
