// Санта на маленьких летючих санчатах, обличчям праворуч. Народний персонаж у загальному вигляді — без чужих логотипів.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const TOP = [
  '..............',
  '......rrrW....',
  '.....rrrr.....',
  '....WWWWWW....',
  '....sskss.....',
  '...WWsssWW....',
  '...WWWWWWW....',
  '..rrrWWWrrr...',
  '.rrrrrrrrrrs..',
  '.rrrkkykrrr...',
];

export default {
  key: 'santa',
  w: 56,
  h: 56,
  cell: 4,
  palette: { k: C.outline, r: C.hatRed, W: C.snow, s: C.skin, y: C.gold, n: C.sledWood, N: C.sledDark },
  frames: {
    fly1: outline([...TOP, '.nnnnnnnnnnnn.', '..NNNNNNNNNNN.', '.y..........y.', '..............']),
    fly2: outline([...TOP, '.nnnnnnnnnnnn.', '..NNNNNNNNNNN.', '..y........y..', '..............']),
  },
  anims: { fly: { frames: ['fly1', 'fly2'], fps: 4, repeat: -1 } },
};
