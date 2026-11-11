// Бос 2 «Шкодько»: оригінальний персонаж (специфікація §1). Пухкий лисий зелений гоблін-злодюга
// у кривій шапці-ялинці (з кульками), з шарфом із мішури і латаним мішком за спиною. Не худий, не волохатий, без костюма Санти.
// Кадри: dance1/dance2 (танець), laugh (сміється — дощ подарунків і визирання з паровоза), stun (оглушений після потяга).
import { C } from '../palette.js';
import { outline } from '../grid.js';

// шапка-ялинка, нахилена праворуч
const HAT = [
  '................',
  '...........y....',
  '..........tt....',
  '.........tot....',
  '........ttTt....',
  '.......tyttTt...',
  '......ttttotT...',
];

const FACE = {
  normal: [
    '....GggggggggG..',
    '...Ggwwkggwwkgg.',
    '...gggggLggggg..',
    '...ggmmmmmmmgg..',
  ],
  laugh: [
    '....GggggggggG..',
    '...Ggkkkggkkkgg.',
    '...gggggLggggg..',
    '...ggmwmwmwmgg..',
  ],
  stun: [
    '....GggggggggG..',
    '...Ggkgkggkgkgg.',
    '...ggkgggggkgg..',
    '...gggmmmmmggg..',
  ],
};

// тулуб: шарф із мішури (y/Y), пузо, мішок за спиною праворуч (n/N, латка p)
const BODY = [
  '..yYyYyYyYyYnn..',
  '.GggggggggggnNn.',
  '.gggLLLLggggnpN.',
  '..ggLLLLgggGnNN.',
];

const LEGS = {
  a: ['...GG....GG.....'],
  b: ['....GG..GG......'],
};

const frame = (face, legs) => outline([...HAT, ...FACE[face], ...BODY, ...LEGS[legs]]);

export default {
  key: 'shkodko',
  w: 64,
  h: 64,
  cell: 4,
  palette: {
    k: C.outline,
    g: C.goblin,
    G: C.goblinDark,
    L: C.goblinLight,
    t: C.treeHat,
    T: C.treeHatDark,
    o: C.hatRed,
    y: C.gold,
    Y: C.snow,
    w: C.white,
    m: C.mouth,
    n: C.sack,
    N: C.sackDark,
    p: C.hatRed,
  },
  frames: {
    dance1: frame('normal', 'a'),
    dance2: frame('normal', 'b'),
    laugh: frame('laugh', 'a'),
    stun: frame('stun', 'a'),
  },
  anims: {
    dance: { frames: ['dance1', 'dance2'], fps: 6, repeat: -1 },
    laugh: { frames: ['laugh', 'dance1'], fps: 5, repeat: -1 },
    stun: { frames: ['stun'], fps: 1, repeat: -1 },
  },
};
