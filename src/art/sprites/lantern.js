// Ліхтарик-дух (бамбук): паперовий ліхтар з вогником. glow1/glow2 — вогник тремтить, blink — спалах перед вибухом.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const frame = (inner, hot) =>
  outline([
    '...DD...',
    '..DDDD..',
    '.rrrrrr.',
    'rRffffRr'.replace(/f/g, inner),
    `rR${inner}${hot}${hot}${inner}Rr`,
    `rR${inner}${hot}${hot}${inner}Rr`,
    'rRffffRr'.replace(/f/g, inner),
    '.rrrrrr.',
    '..DDDD..',
    '...yy...',
  ]);

export default {
  key: 'lantern',
  w: 36,
  h: 44,
  cell: 4,
  palette: { k: C.outline, r: C.lanternRed, R: C.lanternDark, D: C.lanternDark, f: C.flame, F: C.flameHot, y: C.gold, w: C.white },
  frames: {
    glow1: frame('r', 'f'),
    glow2: frame('f', 'F'),
    blink: frame('F', 'w'),
  },
  anims: {
    glow: { frames: ['glow1', 'glow2'], fps: 4, repeat: -1 },
    blink: { frames: ['blink', 'glow2'], fps: 10, repeat: -1 },
  },
};
