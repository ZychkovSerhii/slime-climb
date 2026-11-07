// Сокира Рагнара в руках слизака. Бородате лезо, держак униз.
import { C } from '../palette.js';

export default {
  key: 'axe',
  w: 32,
  h: 40,
  cell: 4,
  palette: { k: C.outline, L: C.metalLight, M: C.metal, m: C.metalDark, W: C.wood, D: C.woodDark },
  frames: {
    hold: [
      '....kk..',
      '.kkkWk..',
      'kLLMWk..',
      'kLMMWk..',
      'kLMmWk..',
      '.kkmWk..',
      '...kWk..',
      '...kWk..',
      '...kDk..',
      '....k...',
    ],
  },
};
