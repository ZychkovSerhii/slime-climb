// Білий ведмідь. walk1/walk2 — боком, мордою праворуч; rear — на задніх лапах, ричить (попередження перед ричанням).
import { C } from '../palette.js';
import { outline } from '../grid.js';

const BODY = [
  '................',
  '................',
  '................',
  '...........ww...',
  '..........wwwwww',
  '..wwwwwwwwwwkwwn',
  '.wwwwwwwwwwwwww.',
  'wwwwwwwwwwwwww..',
  'wwwwwwwwwwwwwd..',
  'dwwwwwwwwwwwwd..',
];

export default {
  key: 'bear',
  w: 64,
  h: 64,
  cell: 4,
  palette: { k: C.outline, w: C.bearWhite, d: C.bearShade, n: C.bearNose, R: C.mouth },
  frames: {
    walk1: outline([...BODY, '.ww..ww...ww.ww.', '.ww..ww...ww.ww.', '.dd..dd...dd.dd.', '................', '................', '................']),
    walk2: outline([...BODY, '..ww.ww..ww..ww.', '..ww.ww..ww..ww.', '..dd.dd..dd..dd.', '................', '................', '................']),
    rear: outline([
      '....ww....ww....',
      '....wwwwwwww....',
      '...wwkwwwwkww...',
      '...wwwwnnwwww...',
      '..d.wwwRRwww.d..',
      '.dw..wwRRww..wd.',
      '.ww.wwwwwwww.ww.',
      '..wwwwwwwwwwww..',
      '....wwwwwwww....',
      '....wwwwwwww....',
      '....wwwwwwww....',
      '....wwwwwwww....',
      '....dwwwwwwd....',
      '....ww....ww....',
      '....ww....ww....',
      '...ddd....ddd...',
    ]),
  },
  anims: {
    walk: { frames: ['walk1', 'walk2'], fps: 6, repeat: -1 },
    rear: { frames: ['rear'], fps: 1 },
  },
};
