// Скін «Пес-патріот» (фідбек-8): власний пес-слизак — коричневі вуха-лопухи, світла морда, чорний ніс
// і синьо-жовта хустка на шиї. Не реальний пес-знаменитість (правило гри: без чужих персонажів). Розмір і кадри — як у slime.
import { C } from '../palette.js';

export default {
  key: 'skinDog',
  w: 48,
  h: 48,
  cell: 4,
  palette: { k: C.outline, b: 0x6b4423, T: 0xe0b878, t: 0xc49a5c, n: 0x1d1d24, w: C.white, U: 0x2f6fd6, Y: 0xffd23f },
  frames: {
    idle1: [
      '............',
      '...kkkkkk...',
      '.kkTTTTTTkk.',
      'kbbTTTTTTbbk',
      'kbbTwkTwkbbk',
      'kbbTTTTTTbbk',
      'kbbTTnnTTbbk',
      '.kbtTkkTtbk.',
      '.ktTTTTTTtk.',
      'kUUUUUUUUUUk',
      'kYYYYYYYYYYk',
      '.kkkkkkkkkk.',
    ],
    idle2: [
      '............',
      '............',
      '..kkkkkkkk..',
      '.kbTTTTTTbk.',
      'kbbTwkTwkbbk',
      'kbbTTTTTTbbk',
      'kbbTTnnTTbbk',
      'kbbtTkkTtbbk',
      '.ktTTTTTTtk.',
      'kUUUUUUUUUUk',
      'kYYYYYYYYYYk',
      '.kkkkkkkkkk.',
    ],
    jump: [
      '....kkkk....',
      '..kkTTTTkk..',
      '.kbTTTTTTbk.',
      '.kbTwkTwkbk.',
      '.kbTTTTTTbk.',
      '.kbTTnnTTbk.',
      '.kbtTkkTtbk.',
      '..ktTTTTtk..',
      '..kUUUUUUk..',
      '..kYYYYYYk..',
      '...kYYYYk...',
      '....kkkk....',
    ],
  },
  anims: {
    idle: { frames: ['idle1', 'idle2'], fps: 2.5, repeat: -1 },
    jump: { frames: ['jump'], fps: 1 },
  },
};
