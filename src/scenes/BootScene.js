import * as Phaser from 'phaser';

// Опис текстур-заглушок. Розміри тут — частина «малюнка», а не балансу:
// у Task 2 ігрові розміри (playerSize, wallWidth, spikeHeight) з'являться в BALANCE.
const TEXTURES = {
  slime: { w: 48, h: 48, draw: drawSlime },
  wall: { w: 60, h: 64, draw: drawWall },
  spike: { w: 40, h: 40, draw: drawSpike },
  projectile: { w: 16, h: 16, draw: (g) => circle(g, 0x9cff57, 8) },
  lion: { w: 56, h: 56, draw: (g) => pixels(g, LIONESS, LION_PAL, 4) },
  lionBite: { w: 56, h: 56, draw: (g) => pixels(g, LIONESS_BITE, LION_PAL, 4) },
  bat: { w: 40, h: 28, draw: (g) => box(g, 0x6b4f8a, 40, 28) },
  plant: { w: 44, h: 44, draw: (g) => box(g, 0x2f8f3a, 44, 44) },
  plantBullet: { w: 14, h: 14, draw: (g) => circle(g, 0xb7ff3b, 7) },
  spider: { w: 120, h: 100, draw: (g) => box(g, 0x2b2b2b, 120, 100) },
  smallSpider: { w: 28, h: 22, draw: (g) => box(g, 0x3a3a3a, 28, 22) },
  shadow: { w: 120, h: 40, draw: drawShadow },
  heart: { w: 32, h: 28, draw: drawHeart },
};

// Левиця боком, мордою праворуч (14×14, піксель = 4 px). Повний піксель-арт — етап 3.
const LION_PAL = { b: 0xd9a35b, d: 0xa8743a, e: 0x1a1a1a, n: 0x5a3a20, w: 0xffffff, m: 0x8a2020 };
const LIONESS = [
  '..............',
  '..............',
  '..........dd..',
  '.........bbbb.',
  '.d.......bbebb',
  'd.bbbbbbbbbbbn',
  '.bbbbbbbbbbbb.',
  '.bbbbbbbbbbb..',
  '..bbbbbbbbb...',
  '..bd.....db...',
  '..b.......b...',
  '.dd......dd...',
  '..............',
  '..............',
];
// у стрибку: паща відкрита, лапи витягнуті
const LIONESS_BITE = [
  '..............',
  '..........dd..',
  '.........bbbb.',
  '.d.......bbebb',
  'd.bbbbbbbbbbbn',
  '.bbbbbbbbbbww.',
  '.bbbbbbbbbbm..',
  '.bbbbbbbbbbww.',
  'db.......bd...',
  'b.........bd..',
  '...........d..',
  '..............',
  '..............',
  '..............',
];

/** Малює піксель-арт: rows — рядки однакової довжини, символ → колір з pal, '.' — прозоро. */
function pixels(g, rows, pal, scale) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle(pal[ch], 1);
      g.fillRect(x * scale, y * scale, scale, scale);
    });
  });
}

function box(g, color, w, h) {
  g.fillStyle(color, 1);
  g.fillRect(0, 0, w, h);
}

function circle(g, color, r) {
  g.fillStyle(color, 1);
  g.fillCircle(r, r, r);
}

function drawSlime(g) {
  g.fillStyle(0x4cd964, 1);
  g.fillRect(0, 0, 48, 48);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(15, 18, 6);
  g.fillCircle(33, 18, 6);
  g.fillStyle(0x000000, 1);
  g.fillCircle(16, 19, 3);
  g.fillCircle(34, 19, 3);
}

function drawWall(g) {
  g.fillStyle(0x3d2f24, 1);
  g.fillRect(0, 0, 60, 64);
  g.fillStyle(0x5a4636, 1);
  g.fillRect(4, 4, 24, 26);
  g.fillRect(32, 34, 24, 26);
}

function drawSpike(g) {
  // вістрям праворуч; для правої стіни спрайт віддзеркалюється
  g.fillStyle(0xd8d8d8, 1);
  g.fillTriangle(0, 0, 40, 20, 0, 40);
}

function drawShadow(g) {
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(60, 20, 120, 40);
}

function drawHeart(g) {
  g.fillStyle(0xff3b5c, 1);
  g.fillCircle(9, 9, 9);
  g.fillCircle(23, 9, 9);
  g.fillTriangle(0, 11, 32, 11, 16, 28);
}

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    for (const [key, t] of Object.entries(TEXTURES)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      t.draw(g);
      g.generateTexture(key, t.w, t.h);
      g.destroy();
    }
    this.scene.start('Menu');
  }
}
