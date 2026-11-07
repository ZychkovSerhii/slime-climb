// Кажан анфас. Кадри: крила вгору / вниз.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'bat',
  w: 40,
  h: 28,
  cell: 4,
  palette: { k: C.outline, p: C.batBody, P: C.batWing, r: C.eyeRed, w: C.white },
  frames: {
    up: outline(['P..k..k..P', 'PP.pppp.PP', 'PPPrpprPPP', '.PPppppPP.', '..PpwwpP..', '...pppp...', '....pp....']),
    down: outline(['...k..k...', '...pppp...', '..PrpprP..', '.PPppppPP.', 'PPPpwwpPPP', 'PP.pppp.PP', 'P...pp...P']),
  },
  anims: { fly: { frames: ['up', 'down'], fps: 8, repeat: -1 } },
};
