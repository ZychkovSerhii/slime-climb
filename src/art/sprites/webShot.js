// Постріл «Дупи павучихи» — біла куля павутини.
import { C } from '../palette.js';

export default {
  key: 'webShot',
  w: 16,
  h: 16,
  cell: 4,
  palette: { w: C.white, g: 0xc8d0cc },
  frames: { shot: ['.ww.', 'wgww', 'wwgw', '.ww.'] },
};
