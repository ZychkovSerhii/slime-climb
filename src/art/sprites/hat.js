// «Модний капелюх» — фіолетовий конус із золотою стрічкою і помпоном.
import { C } from '../palette.js';

export default {
  key: 'hat',
  w: 28,
  h: 32,
  cell: 4,
  palette: { k: C.outline, p: 0x7a3cc8, P: 0xb47cff, y: 0xffd23f, w: C.white },
  frames: {
    hat: ['...w...', '..kPk..', '..kPpk.', '.kPPpk.', '.kyyyyk', 'kPPPppk', 'kkkkkkk', '.......'],
  },
};
