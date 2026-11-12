// Плитка лавової стіни (етап 11): базальт із тріщинами, що жевріють. Як wall.js: внутрішній край праворуч, розмір як у wall.
import { C } from '../palette.js';

export default {
  key: 'wallLava',
  w: 60,
  h: 64,
  cell: 4,
  palette: { d: C.basaltDark, b: C.basalt, o: C.lavaDark, r: C.lava, E: C.lavaHot },
  frames: {
    tile: [
      'dbbbbbdbbbbbboE',
      'dorbbbdbbbbbbdr',
      'dborbbdbbbbbbdd',
      'dborbbdbbbbbbdE',
      'dbborbdbbbbbbor',
      'ddddddddddddddd',
      'dbbdbbbborbbbdE',
      'dbbdbbborbbbbdr',
      'dbbdbbborbbbbod',
      'dbbdbborbbbbbdE',
      'ddddddddddddddr',
      'dborbbbbbdbbbdd',
      'dbborrbbbdbbboE',
      'dbbbbbbbbdrbbdr',
      'dbbbbbbbbdorbdd',
      'dbbbbbbbbdbbbdE',
    ],
  },
};
