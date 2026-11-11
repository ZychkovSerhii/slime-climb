// Малі слимаки Колі (фаза 80%): кусака (рожево-червоний, з зубками) і личинка-стрілець (бузкова, з круглим ротом).
// Розмір — утричі більший за кажана за площею (§9.2). Дивляться праворуч, код віддзеркалює.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const biter = (wave) =>
  outline([
    '..........e.e..',
    '..........P.P..',
    '.......PPPPPPP.',
    '.....PPPPPPPPmP',
    '...PPPPLPPPPtmt',
    '..PPPPPPPPPPPPd',
    wave ? '.dbbbdbbbbdbbd.' : '.dbbbbbbbbbbbd.',
    wave ? '..ddd.ddd.ddd..' : '..ddddddddddd..',
  ]);

const spitter = (wave) =>
  outline([
    '..........e.e..',
    '..........Q.Q..',
    '.......QQQQQQQ.',
    '.....QQQQQQQQQQ',
    '...QQQQLQQQQQoo',
    '..QQQQQQQQQQQQq',
    wave ? '.qbbbqbbbbqbbq.' : '.qbbbbbbbbbbbq.',
    wave ? '..qqq.qqq.qqq..' : '..qqqqqqqqqqq..',
  ]);

export default {
  key: 'slug',
  w: 64,
  h: 48,
  cell: 4,
  palette: {
    k: C.outline, e: C.white, P: C.kolyaDark, d: C.lanternDark, L: C.kolyaLight, b: C.kolya, m: C.mouth, t: C.tooth,
    Q: C.spitter, q: C.spitterDark, o: C.spit,
  },
  frames: { biter1: biter(false), biter2: biter(true), spitter1: spitter(false), spitter2: spitter(true) },
  anims: {
    biter: { frames: ['biter1', 'biter2'], fps: 5, repeat: -1 },
    spitter: { frames: ['spitter1', 'spitter2'], fps: 4, repeat: -1 },
  },
};
