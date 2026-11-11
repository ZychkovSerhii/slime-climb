// Пінгвін ковзає на пузі, головою праворуч. Два кадри — ласти ворушаться.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const BODY = [
  '............',
  '.......bbb..',
  '...bbbbbbwbo',
  '.bbBbbbbbbbo',
  'bbbbbbbbbbb.',
  '.wwwwwwwwwb.',
  '..wwwwwwww..',
];

export default {
  key: 'penguin',
  w: 48,
  h: 40,
  cell: 4,
  palette: { k: C.outline, b: C.penguinBlack, B: C.penguinBlue, w: C.white, o: C.beak },
  frames: {
    slide1: outline([...BODY, 'oo..........', '............']),
    slide2: outline([...BODY, '.oo.........', '............']),
  },
  anims: { slide: { frames: ['slide1', 'slide2'], fps: 6, repeat: -1 } },
};
