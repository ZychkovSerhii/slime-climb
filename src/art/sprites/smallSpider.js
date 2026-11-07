// Павучок від боса (вигляд згори). Світліший за павучиху: дрібна ціль на темному фоні мусить читатися.
// Кадри: лапи в двох положеннях.
import { C } from '../palette.js';

export default {
  key: 'smallSpider',
  w: 28,
  h: 22,
  cell: 4,
  palette: { k: C.outline, c: C.spiderLight, A: C.spiderGrey, h: C.spiderLight, r: C.eyeRed },
  frames: {
    a: ['c.....c', '.cAhAc.', 'cArArAc', '.cAAAc.', 'c.....c'],
    b: ['.c...c.', 'ccAhAcc', '.ArArA.', 'ccAAAcc', '.c...c.'],
  },
  anims: { crawl: { frames: ['a', 'b'], fps: 10, repeat: -1 } },
};
