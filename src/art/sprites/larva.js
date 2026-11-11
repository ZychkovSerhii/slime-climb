// «Личинка-помічник» (трофей Колі): маленька кремова личинка, що сидить на слизакові. spit — плює.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'larva',
  w: 27,
  h: 21,
  cell: 3,
  palette: { k: C.outline, l: C.larva, L: C.larvaDark, w: C.white, m: C.spit },
  frames: {
    idle: outline(['.........', '.....w.w.', '..lllllll', '.lLlLlLll', 'llllllll.', '.LLLLLLL.', '.........']),
    spit: outline(['.........', '.....w.w.', '..llllllm', '.lLlLlLlm', 'llllllll.', '.LLLLLLL.', '.........']),
  },
  anims: {
    idle: { frames: ['idle'], fps: 1, repeat: -1 },
    spit: { frames: ['spit', 'idle'], fps: 6 },
  },
};
