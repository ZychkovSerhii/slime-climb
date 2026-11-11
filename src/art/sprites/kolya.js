// Бос 3 «Слимак Коля» (етап 9): власний персонаж — великий світло-рожевий слимак БЕЗ мушлі, з двома ріжками-очима.
// Дивиться праворуч; коли повзе ліворуч, код віддзеркалює спрайт.
// Кадри: crawl1/crawl2 — повзе (хвиля по пузу), squeeze — стискається перед ривком (ріжки втягнуті),
// breathe — стоїть і дихає (рот відкритий), eat — з'їдає рештки (рот широкий).
import { C } from '../palette.js';
import { outline } from '../grid.js';

const EYES = '................WkW.WkW.';
const STALK = '.................P...P..';
const BASE = '................PPP.PP..';
const BODY = (mouth) => [
  '.............PPPPPPPPP..',
  '..........PPPPPPPPPPPPP.',
  '.......PPPPLLPPPPPPPPPPP',
  `.....PPPPLLPPPPPPPPPP${mouth}PP`,
  '...PPPPPPPPPPPPPPPPPPPPd',
  '..PPPPPPPPPPPPPPPPPPPPd.',
  '.dPPPPPPPPPPPPPPPPPPPdd.',
];
const BELLY1 = ['ddbbbbbbbbbbbbbbbbbbbdd.', '.ddddddddddddddddddddd..'];
const BELLY2 = ['ddbbbbbdbbbbbbdbbbbbbdd.', '..dddddd.dddddd.ddddd...'];

const frame = (top, mouth, belly) => outline([...top, ...BODY(mouth), ...belly]);

export default {
  key: 'kolya',
  w: 96,
  h: 64,
  cell: 4,
  palette: { k: C.outline, W: C.white, P: C.kolya, d: C.kolyaDark, L: C.kolyaLight, b: C.kolyaBelly, m: C.mouth },
  frames: {
    crawl1: frame([EYES, STALK, STALK, BASE], 'm', BELLY1),
    crawl2: frame([EYES, STALK, BASE, BASE], 'm', BELLY2),
    squeeze: frame(['........................', '........................', EYES, BASE], 'P', BELLY1),
    breathe: frame([EYES, STALK, STALK, BASE], 'm', BELLY2),
    eat: frame([EYES, STALK, STALK, BASE], 'm', ['ddbbbbbbbbbbbbbbbbbbmmd.', '.dddddddddddddddddddmd..']),
  },
  anims: {
    crawl: { frames: ['crawl1', 'crawl2'], fps: 4, repeat: -1 },
    squeeze: { frames: ['squeeze'], fps: 1, repeat: -1 },
    breathe: { frames: ['breathe', 'crawl1'], fps: 2, repeat: -1 },
    eat: { frames: ['eat', 'breathe'], fps: 6, repeat: -1 },
  },
};
