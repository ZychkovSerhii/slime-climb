// Крапля слизу: нею плюються Коля, його уламки, личинки-стрільці і «Личинка-помічник» (своя — інший відтінок у коді).
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'slimeSpit',
  w: 16,
  h: 16,
  cell: 2,
  palette: { k: C.outline, o: C.spit, O: C.spitLight },
  frames: {
    spit: outline([
      '........',
      '...oo...',
      '..oOOo..',
      '.ooOooo.',
      '.oooooo.',
      '..oooo..',
      '...oo...',
      '........',
    ]),
  },
};
