// Сонце над пагорбами (біом 5, день).
import { C } from '../palette.js';

export default {
  key: 'sun',
  w: 48,
  h: 48,
  cell: 4,
  palette: { S: C.sun, s: C.sunHot },
  frames: {
    sun: [
      '....SSSS....',
      '..SSssssSS..',
      '.SssssssssS.',
      '.SssssssssS.',
      'SssssssssssS',
      'SssssssssssS',
      'SssssssssssS',
      'SssssssssssS',
      '.SssssssssS.',
      '.SssssssssS.',
      '..SSssssSS..',
      '....SSSS....',
    ],
  },
};
