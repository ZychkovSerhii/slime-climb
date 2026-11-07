// Постріл гравця — грудочка слизу.
import { C } from '../palette.js';

export default {
  key: 'projectile',
  w: 16,
  h: 16,
  cell: 4,
  palette: { G: C.slime, L: C.slimeLight, w: C.white },
  frames: { shot: ['.LL.', 'LwLG', 'LLGG', '.GG.'] },
};
