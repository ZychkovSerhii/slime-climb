// Ельф: дрібний, у ковпаку з помпоном. Кадри бігу. Контур — автоматично.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const TOP = [
  '.....W...',
  '....rr...',
  '...rrRr..',
  '..rrrrrr.',
  '.essssse.',
  '..sksks..',
  '..sssss..',
  '..gGggg..',
  '.sgggggs.',
  '..gyyyg..',
];

export default {
  key: 'elf',
  w: 44,
  h: 52,
  cell: 4,
  palette: { k: C.outline, W: C.snow, r: C.hatRed, R: C.hatRedDark, s: C.skin, e: C.skinShade, g: C.elfGreen, G: C.elfGreenLight, y: C.gold },
  frames: {
    run1: outline(['.........', ...TOP, '..g...g..', '.kk...kk.']),
    run2: outline(['.........', ...TOP, '...g.g...', '...kk.kk.']),
  },
  anims: { run: { frames: ['run1', 'run2'], fps: 10, repeat: -1 } },
};
