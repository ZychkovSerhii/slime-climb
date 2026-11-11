// Плювок павучихи — біла грудка павутини з темним контуром (добре видно на темному фоні).
import { C } from '../palette.js';

export default {
  key: 'webBall',
  w: 27,
  h: 27,
  cell: 3,
  palette: { k: C.outline, w: C.white, g: 0xc8d0cc },
  frames: {
    ball: ['..kkkkk..', '.kwwgwwk.', 'kwgwwwgwk', 'kwwwgwwwk', 'kgwgwgwgk', 'kwwwgwwwk', 'kwgwwwgwk', '.kwwgwwk.', '..kkkkk..'],
  },
};
