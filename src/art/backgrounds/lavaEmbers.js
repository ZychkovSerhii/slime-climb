// Фон лави (етап 11): темно-бурий шум, як у печері (slimeCave.draw), і рідкі тріщини, що жевріють.
// Іскри на фоні — окремі частинки (спрайт ember, entities/Embers.js). Заміна готовим малюнком: src/art/png/bgLava.png.
import slimeCave from './slimeCave.js';

export const CFG = {
  cell: 4,
  seed: 41,
  step: 9,
  levels: [0.42, 0.62],
  colors: [0x140b08, 0x1d100b, 0x26150e],
  sporeEvery: 1900, // жевріючі цятки
  spore: 0xd2541f,
  halo: 0x3a1a0c,
  cracks: [
    [60, 40, 6], [210, 300, 5], [380, 120, 7], [500, 420, 4], [130, 500, 6],
  ], // x, y, довжина (у клітинках) — зигзаг униз
  crack: 0x5a1e0c,
  crackHot: 0xa8321a,
};

export default {
  key: 'bgLava',
  parallax: 0.3,
  tileW: 600,
  tileH: 576,
  draw(g, w, h) {
    slimeCave.draw(g, w, h, CFG);
    const c = CFG.cell;
    for (const [x0, y0, n] of CFG.cracks) {
      let x = x0;
      for (let i = 0; i < n; i++) {
        const y = y0 + i * c * 2;
        if (x < 0 || x + c > w || y + 2 * c > h) break;
        g.fillStyle(CFG.crack, 1);
        g.fillRect(x, y, c, 2 * c);
        if (i % 2) {
          g.fillStyle(CFG.crackHot, 1);
          g.fillRect(x, y + c, c, c);
        }
        x += i % 2 ? c : -c;
      }
    }
  },
};
