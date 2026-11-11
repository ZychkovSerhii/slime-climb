// Льодяник-посох, яким кидається ельф. Дрібні пікселі (2 px) — ворожий снаряд має бути помітним; крутиться в польоті.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'candy',
  w: 20,
  h: 20,
  cell: 2,
  palette: { k: C.outline, r: C.hatRed, w: C.white },
  frames: {
    candy: outline([
      '..........',
      '...rwr....',
      '..w...w...',
      '..r...r...',
      '......w...',
      '......r...',
      '......w...',
      '......r...',
      '......w...',
      '..........',
    ]),
  },
};
