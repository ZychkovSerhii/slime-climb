// Іскра на фоні лави (як сніжинка). Прозорість і кількість — у BALANCE.lava.embers.
import { C } from '../palette.js';

export default {
  key: 'ember',
  w: 6,
  h: 6,
  cell: 2,
  palette: { E: C.lavaHot, r: C.lava },
  frames: {
    ember: [
      '.E.',
      'ErE',
      '.E.',
    ],
  },
};
