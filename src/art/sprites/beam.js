// Струмінь вогню саламандри: код розтягує по ширині коридору; лінія-попередження — той самий спрайт, напівпрозорий.
import { C } from '../palette.js';

export default {
  key: 'beam',
  w: 32,
  h: 12,
  cell: 4,
  palette: { o: C.lava, r: C.lavaHot, E: C.white },
  frames: {
    beam: [
      'oooooooo',
      'rEErEErE',
      'oooooooo',
    ],
  },
};
