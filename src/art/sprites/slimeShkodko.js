// Скін «Я ШКОДЬКО»: слизак-гоблін у кривій шапці-ялинці (t/T, кулька o) і шарфі з мішури (y/Y).
// Оригінальний персонаж гри (§1). Ті самі кадри й розмір, що в slime, тож хітбокс не міняється.
import { C } from '../palette.js';

export default {
  key: 'slimeShkodko',
  w: 48,
  h: 48,
  cell: 4,
  palette: {
    k: C.outline, g: C.goblinDark, G: C.goblin, L: C.goblinLight, w: C.white,
    t: C.treeHat, T: C.treeHatDark, o: C.hatRed, y: C.gold, Y: C.snow,
  },
  frames: {
    idle1: [
      '.......tto..',
      '....kttTt...',
      '..kkGGGGkk..',
      '.kGLLGGGGGk.',
      '.kGLGGGGGGk.',
      'kGGGGwwGwwGk',
      'kGGGGwkGwkGk',
      'kGGGGGGGGGGk',
      'kyYyYyYyYyYk',
      'kggGGGGGGggk',
      'kggggggggggk',
      '.kkkkkkkkkk.',
    ],
    idle2: [
      '............',
      '.......tto..',
      '...kkttTtk..',
      '.kkGLLGGGkk.',
      'kGGLGGGGGGGk',
      'kGGGGwwGwwGk',
      'kGGGGwkGwkGk',
      'kGGGGGGGGGGk',
      'kyYyYyYyYyYk',
      'kggGGGGGGggk',
      'kggggggggggk',
      '.kkkkkkkkkk.',
    ],
    jump: [
      '......tto...',
      '....kttTk...',
      '..kGLLGGGk..',
      '..kGLGGGGk..',
      '.kGGwwGwwGk.',
      '.kGGwkGwkGk.',
      '.kGGGGGGGGk.',
      '.kyYyYyYyYk.',
      '.kgGGGGGGgk.',
      '..kgGGGGgk..',
      '...kggggk...',
      '....kkkk....',
    ],
  },
  anims: {
    idle: { frames: ['idle1', 'idle2'], fps: 2.5, repeat: -1 },
    jump: { frames: ['jump'], fps: 1 },
  },
};
