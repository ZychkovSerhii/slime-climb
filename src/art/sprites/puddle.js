// Калюжа лави на стіні (коло 2+): після виливання Казана стіна ще зайнята. На правій код віддзеркалює.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'puddle',
  w: 24,
  h: 48,
  cell: 4,
  palette: { k: C.outline, r: C.lavaDark, R: C.lava, E: C.lavaHot },
  frames: {
    puddle: outline([
      '.rr...',
      'rEEr..',
      'rEEr..',
      'rRRr..',
      'rEEr..',
      'rEEr..',
      'rRRr..',
      'rEEr..',
      'rEEr..',
      'rRRr..',
      'rEEr..',
      '.rr...',
    ]),
  },
};
