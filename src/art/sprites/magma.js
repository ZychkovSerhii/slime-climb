// Крапля магми: нею плюється Казан і хлюпає «Черпачок».
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'magma',
  w: 16,
  h: 16,
  cell: 2,
  palette: { k: C.outline, r: C.lavaDark, R: C.lava, E: C.lavaHot },
  frames: {
    magma: outline([
      '........',
      '...rr...',
      '..rREr..',
      '.rREERr.',
      '.rRERRr.',
      '..rRRr..',
      '...rr...',
      '........',
    ]),
  },
};
