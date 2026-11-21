// Колючий кущ — шип трав'яних стін (розмір і хітбокс як spike). Колючками праворуч, з ягідками.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'thornBush',
  w: 40,
  h: 40,
  cell: 4,
  palette: { k: C.outline, t: C.thorn, T: C.thornLight, g: C.grassDark, b: C.berry, w: C.thornTip },
  frames: {
    thornBush: outline([
      '.w...w....',
      'tgw.tTw...',
      'tggTTTTw..',
      'tgTTbTTTTw',
      'tgTTTTgTw.',
      'tggTbTTTTw',
      'tgTTTTgTw.',
      'tgTbTTTTTw',
      'tgTTwTTw..',
      '.w..w.....',
    ]),
  },
};
