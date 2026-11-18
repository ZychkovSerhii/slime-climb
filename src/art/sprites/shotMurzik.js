// Постріл скіна «Мурзик» — рудий клубочок із білою цяткою.
import { C } from '../palette.js';

export default {
  key: 'shotMurzik',
  w: 16,
  h: 16,
  cell: 4,
  palette: { o: 0xf2a03a, O: 0xc9762a, w: C.white },
  frames: { shot: ['.oo.', 'owoO', 'ooOO', '.OO.'] },
};
