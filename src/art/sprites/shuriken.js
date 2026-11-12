// Сюрикен ніндзі: летить по прямій і крутиться (обертання — у коді).
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'shuriken',
  w: 20,
  h: 20,
  cell: 2,
  palette: { k: C.outline, m: C.metal, M: C.metalDark, I: C.metalLight },
  frames: {
    shuriken: outline([
      '..........',
      '....M.....',
      '....mM....',
      '.MM.mm....',
      '..mmIImmM.',
      '.MmmIImm..',
      '....mm.MM.',
      '....Mm....',
      '.....M....',
      '..........',
    ]),
  },
};
