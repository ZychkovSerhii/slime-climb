// Подарунок-бомба Шкодька: фіолетова коробка з бантом і ґнотом з іскрою. Кадр blink — світліший, перед вибухом.
// Не плутати з добрим подарунком 'gift' (червоний): колір мусить читатися з першого погляду.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const BOX = (w, W) => [
  '.....y....',
  '....k.....',
  '..y.k.y...',
  '...yyy....',
  `.${w}${w}${w}y${w}${w}${w}${w}.`,
  '.yyyyyyyy.',
  `.${W}${w}${w}y${w}${w}${w}${W}.`,
  `.${W}${W}${W}y${W}${W}${W}${W}.`,
  '..........',
  '..........',
];

export default {
  key: 'giftBomb',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, b: C.bombWrap, B: C.bombWrapDark, y: C.gold, w: C.white, s: C.snowShade },
  frames: {
    bomb: outline(BOX('b', 'B')),
    blink: outline(BOX('w', 's')),
  },
  anims: { blink: { frames: ['bomb', 'blink'], fps: 8, repeat: -1 } },
};
