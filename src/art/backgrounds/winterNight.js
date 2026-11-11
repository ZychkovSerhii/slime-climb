// Фон зими: темно-синя ніч тим самим шумом, що й печера (slimeCave.draw), і поодинокі тьмяні зірки замість спор.
// Темний і низькоконтрастний — білий ведмідь, сніг і подарунки мусять читатися на ньому.
// Заміна готовим малюнком: src/art/png/bgWinter.png.
import slimeCave from './slimeCave.js';

export const CFG = {
  cell: 4,
  seed: 11,
  step: 10,
  levels: [0.42, 0.62],
  colors: [0x0b1322, 0x0f192c, 0x132036],
  sporeEvery: 1100,
  spore: 0x7d9cc4,
  halo: 0x18253c,
};

export default {
  key: 'bgWinter',
  parallax: 0.3,
  tileW: 600,
  tileH: 520,
  draw(g, w, h) {
    slimeCave.draw(g, w, h, CFG);
  },
};
