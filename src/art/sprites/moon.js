// Місяць (біом 5, ніч).
import { C } from '../palette.js';

export default {
  key: 'moon',
  w: 48,
  h: 48,
  cell: 4,
  palette: { m: C.moonShade, M: C.moon },
  frames: {
    moon: [
      '....mmmm....',
      '..mmMMMm....',
      '.mMMMMm.....',
      '.mMMMm......',
      'mMMMm.......',
      'mMMMm.......',
      'mMMMm.......',
      'mMMMMm......',
      '.mMMMMm.....',
      '.mMMMMMmm...',
      '..mmMMMMMmm.',
      '....mmmm....',
    ],
  },
};
