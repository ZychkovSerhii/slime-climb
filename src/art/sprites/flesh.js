// Гнила плоть (біом 5): падає з малого мерця, лежить на стіні.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'flesh',
  w: 28,
  h: 24,
  cell: 4,
  palette: { k: C.outline, b: C.bone, f: C.fleshDark, F: C.flesh },
  frames: {
    flesh: outline([
      '.bb....',
      'bbffF..',
      '.fFFFf.',
      'fFfFFFf',
      '.fFFFf.',
      '..fff..',
    ]),
  },
};
