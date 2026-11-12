// Дрібна іскра: летить по прямій і гасне.
import { C } from '../palette.js';

export default {
  key: 'sparkling',
  w: 12,
  h: 12,
  cell: 2,
  palette: { r: C.lava, E: C.lavaHot },
  frames: {
    s: [
      '......',
      '..rr..',
      '.rEEr.',
      '.rEEr.',
      '..rr..',
      '......',
    ],
  },
};
