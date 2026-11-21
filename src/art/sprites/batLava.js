// Надрова летюча миша (фідбек-9, лава): та сама форма й кадри, що в 'bat', тіло з базальту, крила — розпечена лава.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'batLava',
  w: 40,
  h: 28,
  cell: 4,
  palette: { k: C.outline, p: C.lavaDark, P: C.lava, h: C.lavaHot, r: C.lavaHot, w: C.white },
  frames: {
    up: outline(['h..k..k..h', 'PP.pppp.PP', 'PhPrpprPhP', '.PPppppPP.', '..PpwwpP..', '...pppp...', '....pp....']),
    down: outline(['...k..k...', '...pppp...', '..PrpprP..', '.PhppppPh.', 'PPPpwwpPPP', 'Ph.pppp.hP', 'h...pp...h']),
  },
  anims: { fly: { frames: ['up', 'down'], fps: 8, repeat: -1 } },
};
