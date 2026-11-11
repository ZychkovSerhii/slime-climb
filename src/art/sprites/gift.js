// Подарунок: червона коробка із золотим бантом. Підбирається дотиком — дає досвід.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'gift',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, r: C.hatRed, R: C.hatRedDark, y: C.gold },
  frames: {
    gift: outline([
      '..........',
      '..y...y...',
      '...yyy....',
      '.rrryrrrr.',
      '.rrryrrrr.',
      '.yyyyyyyy.',
      '.RrryrrrR.',
      '.RrryrrrR.',
      '.RRRyRRRR.',
      '..........',
    ]),
  },
};
