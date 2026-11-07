// Фон біому 1: темна мохова печера — плями низькочастотного шуму в 3 відтінках і поодинокі бірюзові спори.
// Спори навмисно не зелені й тьмяні: зелене на екрані — це гравець і його постріли.
// Усе налаштовується в CFG. Детермінований (сід), тайлиться по вертикалі й горизонталі, якщо розміри кратні step*cell.
export const CFG = {
  cell: 4,
  seed: 7,
  step: 8, // розмір плями шуму в клітинках
  levels: [0.42, 0.62], // пороги між відтінками
  colors: [0x0c1511, 0x101c15, 0x142319],
  sporeEvery: 1400, // одна спора на стільки клітинок
  spore: 0x5fa8a0,
  halo: 0x1b3330,
};

function rng(seed) {
  let st = seed;
  return () => (st = (st * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

export default {
  key: 'bg',
  parallax: 0.3, // фон їде повільніше за стіни — відчуття глибини
  tileW: 600,
  tileH: 512,
  draw(g, w, h, cfg = CFG) {
    const cell = cfg.cell;
    const cw = Math.ceil(w / cell);
    const ch = Math.ceil(h / cell);
    const rnd = rng(cfg.seed);
    const gw = Math.max(1, Math.round(cw / cfg.step));
    const gh = Math.max(1, Math.round(ch / cfg.step));
    const lat = Array.from({ length: gh }, () => Array.from({ length: gw }, rnd));
    const L = (x, y) => lat[((y % gh) + gh) % gh][((x % gw) + gw) % gw];
    const sx = gw / cw;
    const sy = gh / ch;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const fx = x * sx;
        const fy = y * sy;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const v = L(x0, y0) * (1 - tx) * (1 - ty) + L(x0 + 1, y0) * tx * (1 - ty) + L(x0, y0 + 1) * (1 - tx) * ty + L(x0 + 1, y0 + 1) * tx * ty;
        const shade = v < cfg.levels[0] ? 0 : v < cfg.levels[1] ? 1 : 2;
        g.fillStyle(cfg.colors[shade], 1);
        g.fillRect(x * cell, y * cell, Math.min(cell, w - x * cell), Math.min(cell, h - y * cell));
      }
    }
    const n = Math.round((cw * ch) / cfg.sporeEvery);
    for (let i = 0; i < n; i++) {
      // спори не біля країв — щоб «сяйво» не обрізалось на стику плиток
      const x = 1 + Math.floor(rnd() * (cw - 2));
      const y = 1 + Math.floor(rnd() * (ch - 2));
      g.fillStyle(cfg.halo, 1);
      g.fillRect((x - 1) * cell, y * cell, cell * 3, cell);
      g.fillRect(x * cell, (y - 1) * cell, cell, cell * 3);
      g.fillStyle(cfg.spore, 1);
      g.fillRect(x * cell, y * cell, cell, cell);
    }
  },
};
