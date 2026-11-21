// Волохань (біом 5): волохатий павук згори, мордою праворуч, з купою червоних очей. Свій, не з чужих ігор.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'hairySpider',
  w: 48,
  h: 40,
  cell: 4,
  palette: { k: C.outline, f: C.spiderFur, F: C.spiderFurLight, L: C.spiderLeg, e: C.spiderEye, E: C.white },
  frames: {
    crawl1: outline([
      '.L...L..L...',
      '..L..L.L..L.',
      '...ffffff.L.',
      '..fFfFFfFfe.',
      'LLFfFFfFFeEe',
      'LLFFfFFfFeEe',
      '..fFfFFfFfe.',
      '...ffffff.L.',
      '..L..L.L..L.',
      '.L...L..L...',
    ]),
    crawl2: outline([
      '...L..L..L..',
      '..L..L..L...',
      '...ffffff.L.',
      '..fFfFFfFfe.',
      'LLFfFFfFFeEe',
      'LLFFfFFfFeEe',
      '..fFfFFfFfe.',
      '...ffffff.L.',
      '..L..L..L...',
      '...L..L..L..',
    ]),
  },
  anims: {
    crawl: { frames: ['crawl1', 'crawl2'], fps: 8, repeat: -1 },
  },
};
