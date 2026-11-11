// Ельф: дрібний, у ковпаку з помпоном, на прозорих крильцях (фідбек-3: політ має бути зрозумілим з вигляду).
// Кадри махання: fly1 — крила вгорі, fly2 — внизу; ноги звисають. Контур — автоматично.
// Назва анімації лишається 'run' — її викликає код.
import { C } from '../palette.js';
import { outline } from '../grid.js';

// 11 стовпців: по краях — місце під крила
const HEAD = [
  '...........',
  '......W....',
  '.....rr....',
  '....rrRr...',
  '...rrrrrr..',
];

export default {
  key: 'elf',
  w: 44,
  h: 52,
  cell: 4,
  palette: {
    k: C.outline, W: C.snow, r: C.hatRed, R: C.hatRedDark, s: C.skin, e: C.skinShade,
    g: C.elfGreen, G: C.elfGreenLight, y: C.gold, b: C.iceLight, B: C.snow,
  },
  frames: {
    fly1: outline([
      ...HEAD,
      'bb.essssse.',
      'bBb.sksks..',
      '.bBbsssss..',
      '..bbgGggg..',
      '...sgggggs.',
      '....gyyyg..',
      '....g...g..',
      '....k...k..',
    ]),
    fly2: outline([
      ...HEAD,
      '...essssse.',
      '....sksks..',
      '....sssss..',
      '..bbgGggg..',
      '.bBbgggggs.',
      'bBb.gyyyg..',
      'bb..g...g..',
      '....k...k..',
    ]),
  },
  anims: { run: { frames: ['fly1', 'fly2'], fps: 10, repeat: -1 } },
};
