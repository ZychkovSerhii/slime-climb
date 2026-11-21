// Бамбукова летюча миша (фідбек-9): та сама форма й кадри, що в 'bat', але зелена, з листочками бамбуку на крилах.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'batBamboo',
  w: 40,
  h: 28,
  cell: 4,
  palette: { k: C.outline, p: C.bambooDark, P: C.bamboo, l: C.leafBamboo, r: C.eyeRed, w: C.white },
  frames: {
    up: outline(['l..k..k..l', 'Pl.pppp.lP', 'PPPrpprPlP', '.PlppppPP.', '..PpwwpP..', '...pppp...', '....pp....']),
    down: outline(['...k..k...', '...pppp...', '..PrpprP..', '.PlppppPP.', 'PlPpwwpPlP', 'PP.pppp.lP', 'l...pp...P']),
  },
  anims: { fly: { frames: ['up', 'down'], fps: 8, repeat: -1 } },
};
