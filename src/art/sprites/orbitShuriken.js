// Сюрикен скіла «Сюрикени» (фідбек-6 п.8): крутиться довкола слизака. Окремий від ворожого (shuriken), щоб гравець
// розрізняв свої й чужі: крижано-блакитний з золотим центром. Обертання — у коді.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'orbitShuriken',
  w: 20,
  h: 20,
  cell: 2,
  palette: { k: C.outline, m: C.ice, M: C.iceDark, I: C.gold },
  frames: {
    orbitShuriken: outline([
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
