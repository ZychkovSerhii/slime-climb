// Вогняна куля вогняного жезла (етап 14): жаринка з білим серцем.
import { C } from '../palette.js';

export default {
  key: 'fireball',
  w: 16,
  h: 16,
  cell: 4,
  palette: { r: C.lavaDark, o: C.lava, y: C.lavaHot, w: C.white },
  frames: { shot: ['.oo.', 'oywo', 'ryyo', '.ro.'] },
};
