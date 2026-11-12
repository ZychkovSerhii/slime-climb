// Зірочка над посиленим ворогом (етап 10, §10.1): з другого кола у ворога є властивість.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'traitStar',
  w: 20,
  h: 20,
  cell: 2,
  palette: { k: C.outline, Y: C.iceLight, w: C.white },
  frames: {
    star: outline([
      '....Y....',
      '....Y....',
      '...YwY...',
      'YYYYwYYYY',
      '.YYwwwYY.',
      '..YYwYY..',
      '..YY.YY..',
      '.YY...YY.',
      '.Y.....Y.',
    ]),
  },
};
