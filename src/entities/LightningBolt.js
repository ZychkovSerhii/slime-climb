// Розряд жезла блискавки (етап 14): ламана лінія від слизака через ланцюг цілей, гасне за FADE_MS.
// Лише картинка — шкоду рахує Combat.
const FADE_MS = 160;
const JAG = 14; // наскільки ламається лінія між точками
const SEG = 28; // довжина одного зламу

export default class LightningBolt {
  /** points — [{x, y}] від слизака по ланцюгу; blastR — коло вибуху в кінці (0 — без нього). */
  constructor(scene, points, blastR = 0) {
    const g = scene.add.graphics().setDepth(30);
    const path = jagged(points);
    for (const [w, c, a] of [[8, 0x6fa4c8, 0.5], [3, 0xffffff, 1]]) {
      g.lineStyle(w, c, a).beginPath();
      g.moveTo(path[0].x, path[0].y);
      for (const p of path.slice(1)) g.lineTo(p.x, p.y);
      g.strokePath();
    }
    if (blastR > 0) {
      const end = points[points.length - 1];
      g.fillStyle(0xb4dcf0, 0.35).fillCircle(end.x, end.y, blastR);
      g.lineStyle(4, 0xffffff, 0.8).strokeCircle(end.x, end.y, blastR);
    }
    scene.tweens.add({ targets: g, alpha: 0, duration: FADE_MS, onComplete: () => g.destroy() });
  }
}

function jagged(points) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.max(Math.round(Math.hypot(b.x - a.x, b.y - a.y) / SEG), 1);
    for (let k = 1; k < n; k++) {
      out.push({ x: a.x + ((b.x - a.x) * k) / n + (Math.random() - 0.5) * JAG, y: a.y + ((b.y - a.y) * k) / n + (Math.random() - 0.5) * JAG });
    }
    out.push(b);
  }
  return out;
}
