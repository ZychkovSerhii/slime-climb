// Сокира Рагнара в руках слизака. Бородате лезо, держак униз.
// Етап 10 (§10.6): 5 виглядів за прокачками 0/3/6/9/12+ — кадри hold (0), tier1…tier4 (Weapons.axeTier).
// Порядок кадрів не міняти: кадр 0 — звичайна сокира (міні-сокира, довідник).
import { C } from '../palette.js';

export default {
  key: 'axe',
  w: 32,
  h: 40,
  cell: 4,
  palette: {
    k: C.outline, L: C.metalLight, M: C.metal, m: C.metalDark, W: C.wood, D: C.woodDark,
    G: C.gold, I: C.iceLight, i: C.ice, R: C.vein, r: C.veinDark, w: C.white,
  },
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
    // 3+: ширше лезо з золотою кромкою
    tier1: [
      '....kk..',
      'kkkkWk..',
      'GLLMWk..',
      'GLMMWk..',
      'GLMMWk..',
      'kGMmWk..',
      '.kkkWk..',
      '...kWk..',
      '...kDk..',
      '...kGk..',
    ],
    // 6+: двосічна
    tier2: [
      '...kk...',
      'kkkWWkkk',
      'GLMWWMLG',
      'GLMWWMLG',
      'GLMWWMLG',
      'kGmWWmGk',
      '.kkWWkk.',
      '...WWk..',
      '...DDk..',
      '...GGk..',
    ],
    // 9+: крижане лезо
    tier3: [
      '...kk...',
      'kkkWWkkk',
      'IwiWWiwI',
      'IwiWWiwI',
      'IiiWWiiI',
      'kIiWWiIk',
      '.kkWWkk.',
      '...WWk..',
      '...DDk..',
      '...IIk..',
    ],
    // 12+: руна, червоне світіння
    tier4: [
      '..kRRk..',
      'kkkWWkkk',
      'RLwWWwLR',
      'RLRWWRLR',
      'RLwWWwLR',
      'kRrWWrRk',
      '.kkWWkk.',
      '..kWWk..',
      '..kDDk..',
      '...RRk..',
    ],
  },
};
