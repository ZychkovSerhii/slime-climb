// Лучник у каптурі (біом 5): дивиться праворуч, лук перед собою. Кадр draw — тятива натягнута.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'archer',
  w: 40,
  h: 48,
  cell: 4,
  palette: { k: C.outline, h: C.hoodDark, H: C.hood, s: C.skinTan, e: C.outline, b: C.bowWood, w: C.bowString },
  frames: {
    idle: outline([
      '...hhh....',
      '..hHHHh...',
      '.hHHHHHhb.',
      '.hHsesHhwb',
      '.hHsssHw.b',
      '..hHHHsw.b',
      '.hHHHHHw.b',
      '.hHHHHHhb.',
      '.hHHHHHh..',
      '..hH.Hh...',
      '..hh.hh...',
    ]),
    draw: outline([
      '...hhh....',
      '..hHHHh...',
      '.hHHHHHh.b',
      '.hHsesHh.b',
      '.hHsssHhwb',
      '..hHHHsw.b',
      '.hHHHHHhwb',
      '.hHHHHHh.b',
      '.hHHHHHh..',
      '..hH.Hh...',
      '..hh.hh...',
    ]),
  },
};
