// Снігова куля (фідбек-6 п.15): котиться по стіні зими й росте. Обертання й ріст — у коді.
import { C } from '../palette.js';
import { outline } from '../grid.js';

export default {
  key: 'snowball',
  w: 32,
  h: 32,
  cell: 2,
  palette: { k: C.outline, s: C.snow, S: C.snowShade, w: C.white, i: C.ice },
  frames: {
    snowball: outline([
      '................',
      '......ssss......',
      '....sswwsssS....',
      '...swwwssssSS...',
      '..swwssssssSSS..',
      '..swsssiSssSSS..',
      '.sssssssssssSSS.',
      '.ssssSssssssSSS.',
      '.sssssssssiSSSS.',
      '.ssiSsssssssSSS.',
      '..ssssssSssSSS..',
      '..sssssssssSSS..',
      '...ssSssssSSS...',
      '....SSSSSSSS....',
      '......SSSS......',
      '................',
    ]),
  },
};
