// «Мішок Шкодька»: латаний мішок, що висить у слизака за спиною. Кадр shake — мішок смикнувся (щось випало).
import { C } from '../palette.js';
import { outline } from '../grid.js';

const BODY = [
  '..y.y...',
  '...yy...',
  '..nnnn..',
  '.nnnNnn.',
  '.nnpnnN.',
  '.nnnnnN.',
  '..NNNN..',
  '........',
];

export default {
  key: 'sack',
  w: 24,
  h: 24,
  cell: 3,
  palette: { k: C.outline, n: C.sack, N: C.sackDark, p: C.hatRed, y: C.gold },
  frames: {
    sack: outline(BODY),
    shake: outline(['........', ...BODY.slice(0, 7)]),
  },
  anims: {
    shake: { frames: ['shake', 'sack'], fps: 8 },
  },
};
