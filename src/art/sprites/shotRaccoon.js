// Постріл скіна «Єнот» — коричнева жолудеподібна кулька з білою смужкою.
import { C } from '../palette.js';

export default {
  key: 'shotRaccoon',
  w: 16,
  h: 16,
  cell: 4,
  palette: { b: 0x8a5a30, B: 0x5a3a1a, w: C.white },
  frames: { shot: ['.bb.', 'wwww', 'bbBB', '.BB.'] },
};
