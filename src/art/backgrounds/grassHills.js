// Фон трави (біом 5): темний луг — шум у 3 приглушених оливкових відтінках (як slimeCave.draw), рідкі квіточки й кущики трави.
// Приглушений навмисно: яскраво-зелене на екрані — це слизак. Сонце й місяць — окремі спрайти (entities/DayNight.js).
// Заміна готовим малюнком: src/art/png/bgGrass.png.
import slimeCave from './slimeCave.js';

export const CFG = {
  cell: 4,
  seed: 53,
  step: 9,
  levels: [0.42, 0.62],
  colors: [0x141f12, 0x1a2816, 0x20301a],
  sporeEvery: 1700, // квіточки
  spore: 0xd8d0a8,
  halo: 0x2a3a1e,
  tuftEvery: 900, // кущики трави (3 стеблинки)
  tuft: 0x34502a,
  flowers: [0xd8c040, 0xa878c8],
};

function rng(seed) {
  let st = seed;
  return () => (st = (st * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

export default {
  key: 'bgGrass',
  parallax: 0.3,
  tileW: 600,
  tileH: 576,
  draw(g, w, h) {
    slimeCave.draw(g, w, h, CFG);
    const c = CFG.cell;
    const cw = Math.floor(w / c);
    const ch = Math.floor(h / c);
    const rnd = rng(CFG.seed + 1);
    const n = Math.round((cw * ch) / CFG.tuftEvery);
    for (let i = 0; i < n; i++) {
      const x = 1 + Math.floor(rnd() * (cw - 3));
      const y = 2 + Math.floor(rnd() * (ch - 3));
      g.fillStyle(CFG.tuft, 1);
      g.fillRect(x * c, (y - 1) * c, c, 2 * c);
      g.fillRect((x + 1) * c, (y - 2) * c, c, 3 * c);
      g.fillRect((x + 2) * c, (y - 1) * c, c, 2 * c);
      if (i % 5 === 0) {
        g.fillStyle(CFG.flowers[i % 2], 1);
        g.fillRect((x + 1) * c, (y - 2) * c, c, c);
      }
    }
  },
};
