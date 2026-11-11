// «Солом'яна шляпа» — плетений бриль із червоною стрічкою. Сидить на голові слизака, злітає на ворогів.
import { C } from '../palette.js';

export default {
  key: 'hat',
  w: 40,
  h: 24,
  cell: 4,
  palette: { k: C.outline, S: 0xf0cf6a, s: 0xc9973a, R: 0xd8282e, r: 0x8e1418 },
  frames: {
    hat: [
      '...kkkk...',
      '..kSsSSk..',
      '..kSSsSk..',
      '.kRRrRRRk.',
      'kSSsSSsSSk',
      '.kkkkkkkk.',
    ],
  },
};
