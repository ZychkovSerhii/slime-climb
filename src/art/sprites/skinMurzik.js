// Скін «Мурзик»: рудий кіт-слизак із чубчиком, ластовинням і світлою грудкою. Власний піксельний малюнок
// за загальними рисами (рудий, чубчик, грудка) — без перемальовування чужої картинки. Розмір і кадри — як у slime.
import { C } from '../palette.js';

export default {
  key: 'skinMurzik',
  w: 48,
  h: 48,
  cell: 4,
  palette: { k: C.outline, O: 0xf2a03a, o: 0xc9762a, c: 0xffd9a0, f: 0x9a5a20, n: 0x5a2a10 },
  frames: {
    idle1: [
      '.....k.k....',
      '.k..kOkOk.k.',
      'kOkkkOOOkkOk',
      'kOOOOOOOOOOk',
      'kOOOOOOOOOOk',
      'kOOOkOOkOOOk',
      'kOOfOnnOfOOk',
      'kOOkOkkOkOOk',
      'koOOccccOOok',
      'koOccccccOok',
      'kooOkOOkOook',
      '.kkkkkkkkkk.',
    ],
    idle2: [
      '............',
      '.....k.k....',
      '.k..kOkOk.k.',
      'kOkkkOOOkkOk',
      'kOOOOOOOOOOk',
      'kOOOkOOkOOOk',
      'kOOfOnnOfOOk',
      'kOOkOkkOkOOk',
      'koOOccccOOok',
      'koOccccccOok',
      'kooOkOOkOook',
      '.kkkkkkkkkk.',
    ],
    jump: [
      '.....k.k....',
      '..k.kOkOk.k.',
      '.kOkkOOOkkOk',
      '.kOOOOOOOOOk',
      '.kOOkOOOkOOk',
      '.kOfOOnOOfOk',
      '.kOOkOkOkOOk',
      '.kOOcccccOOk',
      '.koOcccccOok',
      '..koOcccOok.',
      '...kooooOk..',
      '....kkkkk...',
    ],
  },
  anims: {
    idle: { frames: ['idle1', 'idle2'], fps: 2.5, repeat: -1 },
    jump: { frames: ['jump'], fps: 1 },
  },
};
