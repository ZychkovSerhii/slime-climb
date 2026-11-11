// Ніндзя (бамбук): темний костюм, червона пов'язка. Дивиться в коридор (праворуч); на правій стіні віддзеркалюється.
// Кадри: idle — чіпляється за стіну, throw — кидок сюрикена.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const HEAD = [
  '...NNNN...',
  '..NNNNNN..',
  '..rrrrrrrr',
  '..NseseN.r',
  '..NNNNNN..',
  '...NnnN...',
];

export default {
  key: 'ninja',
  w: 40,
  h: 48,
  cell: 4,
  palette: { k: C.outline, N: C.ninja, n: C.ninjaDark, r: C.ninjaBand, s: C.skin, e: C.white, m: C.metalLight },
  frames: {
    idle: outline([
      ...HEAD,
      '..NNNNNN..',
      '.NNnNNnNN.',
      '.n.NNNN.n.',
      '...NrrN...',
      '..NN..NN..',
      '..nn..nn..',
    ]),
    throw: outline([
      ...HEAD,
      '..NNNNNNNm',
      '.NNnNNNN..',
      '.n.NNNN...',
      '...NrrN...',
      '..NN..NN..',
      '..nn..nn..',
    ]),
  },
  anims: {
    idle: { frames: ['idle'], fps: 1, repeat: -1 },
    throw: { frames: ['throw', 'idle'], fps: 4 },
  },
};
