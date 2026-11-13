// Серце «Кожуха з павучихи» в HUD: та сама форма, що й heart, але помаранчево-коричневе (фідбек-6).
import { C } from '../palette.js';
import heart from './heart.js';

export default {
  ...heart,
  key: 'heartArmor',
  palette: { k: C.outline, x: 0x7a4318, X: 0xd98a3a, w: 0xffe0b0 },
  frames: { heartArmor: heart.frames.heart },
};
