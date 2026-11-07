// Бос-павучиха «Твоя мамаша». Сітка 30×25 будується кодом з простих фігур (черевце, голова, 8 лап),
// тож форму міняють числа в SHAPE, а не перемальовування кожного пікселя.
// Кадри: лапи в двох положеннях. Хочеш намалювати вручну — заміни frames на звичайні сітки.
import { C } from '../palette.js';
import { outline } from '../grid.js';

const W = 30;
const H = 25;
const SHAPE = {
  abdomen: { cx: 14.5, cy: 7.5, rx: 7, ry: 7 },
  head: { cx: 14.5, cy: 16.5, rx: 4.5, ry: 3.5 },
  hourglass: { x: 12, y: 6, rows: ['.yyy..', '..y...', '.yyy..'] },
  eyes: [[12, 16], [17, 16], [13, 15], [16, 15]],
  fangs: [[14, 20], [15, 20]],
};

function legsFrame(swing) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (x, y, ch) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch;
  };
  const line = (x0, y0, x1, y1, ch) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, ch);
  };
  const ellipse = ({ cx, cy, rx, ry }, shade) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) g[y][x] = shade(dx, dy);
      }
  };
  // лапи: від боків голови, колінце вгору, кінчик униз; сусідні пари гойдаються в протифазі
  for (let i = 0; i < 4; i++) {
    const s = i % 2 ? swing : -swing;
    const sy = 13 + i * 1.5;
    const ky = 6 + i * 3 + s;
    const ty = Math.min(12 + i * 3.5 - s, H - 1);
    for (const dir of [-1, 1]) {
      const kx = 15 + dir * (9 + i);
      line(15 + dir * 4, sy, kx, ky, 'h');
      line(kx, ky, 15 + dir * (13 + (i === 3 ? 0 : 1)), ty, 'c');
    }
  }
  ellipse(SHAPE.abdomen, (dx, dy) => (dy < -0.75 ? 'c' : dy < -0.45 || dx < -0.7 ? 'A' : 'a'));
  SHAPE.hourglass.rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && put(SHAPE.hourglass.x + i, SHAPE.hourglass.y + j, ch)));
  ellipse(SHAPE.head, (dx, dy) => (dy < -0.7 ? 'c' : dy < -0.3 ? 'A' : 'a'));
  for (const [x, y] of SHAPE.eyes) put(x, y, 'r');
  for (const [x, y] of SHAPE.fangs) put(x, y, 'w');
  return outline(g.map((r) => r.join('')));
}

export default {
  key: 'spider',
  w: 120,
  h: 100,
  cell: 4,
  palette: { k: C.outline, a: C.spiderBlack, A: C.spiderDark, c: C.spiderGrey, h: C.stoneLight, y: C.spiderMark, r: C.eyeRed, w: C.white },
  frames: { legs1: legsFrame(-1), legs2: legsFrame(1) },
  anims: { legs: { frames: ['legs1', 'legs2'], fps: 4, repeat: -1 } },
};
