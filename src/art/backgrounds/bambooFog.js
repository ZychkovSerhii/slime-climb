// Фон бамбука (етап 9): темно-зелений шум, як у печері (slimeCave.draw), далекі стебла і подекуди теплі паперові ліхтарі.
// Туман 'fog' — окрема прозора плитка: два шари над фоном (під стінами, шипами й ворогами) — див. entities/Fog.js.
// Заміна готовим малюнком: src/art/png/bgBamboo.png, src/art/png/fog.png (прозорий PNG).
import slimeCave from './slimeCave.js';

export const CFG = {
  cell: 4,
  seed: 23,
  step: 9,
  levels: [0.42, 0.62],
  colors: [0x0b1710, 0x0f1f15, 0x13271b],
  sporeEvery: 2600, // ліхтарі — рідко
  spore: 0xc98a3a,
  halo: 0x2a2614,
  stalks: [70, 190, 330, 470], // x далеких стебел
  stalk: 0x16301c,
  node: 0x0e2012,
  nodeEvery: 96,
};

export const FOG = {
  cell: 8,
  seed: 5,
  step: 6,
  color: 0xc6dccf,
  // частка непрозорості за рівнем шуму: м'які клапті, між ними — прозоро
  levels: [
    [0.5, 0.35],
    [0.62, 0.7],
  ],
};

function rng(seed) {
  let st = seed;
  return () => (st = (st * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

const bgBamboo = {
  key: 'bgBamboo',
  parallax: 0.3,
  tileW: 600,
  tileH: 576,
  draw(g, w, h) {
    slimeCave.draw(g, w, h, CFG);
    // стебла лише всередині плитки (краї мусять стикуватися)
    const clip = (x, width) => [Math.max(x, 0), Math.min(x + width, w) - Math.max(x, 0)];
    for (const x of CFG.stalks) {
      if (x + CFG.cell * 5 > w) continue;
      g.fillStyle(CFG.stalk, 1);
      g.fillRect(x, 0, CFG.cell * 4, h);
      g.fillStyle(CFG.node, 1);
      const [nx, nw] = clip(x - CFG.cell, CFG.cell * 6);
      for (let y = x % CFG.nodeEvery; y < h; y += CFG.nodeEvery) g.fillRect(nx, y, nw, CFG.cell);
    }
  },
};

const fog = {
  key: 'fog',
  parallax: 0.15,
  tileW: 480,
  tileH: 480,
  draw(g, w, h) {
    const cell = FOG.cell;
    const cw = Math.ceil(w / cell);
    const ch = Math.ceil(h / cell);
    const rnd = rng(FOG.seed);
    const gw = Math.max(1, Math.round(cw / FOG.step));
    const gh = Math.max(1, Math.round(ch / FOG.step));
    const lat = Array.from({ length: gh }, () => Array.from({ length: gw }, rnd));
    const L = (x, y) => lat[((y % gh) + gh) % gh][((x % gw) + gw) % gw];
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const fx = (x * gw) / cw;
        const fy = (y * gh) / ch;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const v = L(x0, y0) * (1 - tx) * (1 - ty) + L(x0 + 1, y0) * tx * (1 - ty) + L(x0, y0 + 1) * (1 - tx) * ty + L(x0 + 1, y0 + 1) * tx * ty;
        let a = 0;
        for (const [lvl, alpha] of FOG.levels) if (v >= lvl) a = alpha;
        if (!a) continue;
        g.fillStyle(FOG.color, a);
        g.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  },
};

export { bgBamboo, fog };
