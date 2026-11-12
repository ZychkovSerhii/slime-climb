import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { outline, gridOrigin, validateSprite, frameNames } from '../src/art/grid.js';
import { paintGrid } from '../src/art/paint.js';
import { SPRITES } from '../src/art/sprites/index.js';
import { BACKGROUNDS } from '../src/art/backgrounds/index.js';

/** Фальшивий Phaser.Graphics: записує прямокутники. */
function fakeGraphics() {
  const rects = [];
  let color = null;
  return {
    rects,
    fillStyle(c) {
      color = c;
      return this;
    },
    fillRect(x, y, w, h) {
      rects.push({ x, y, w, h, color });
      return this;
    },
  };
}

describe('outline', () => {
  test('обводить заповнені клітинки по 4 сторонах, кути не чіпає', () => {
    expect(outline(['...', '.a.', '...'], 'k')).toEqual(['.k.', 'kak', '.k.']);
  });
  test('наявний контур не обводиться вдруге', () => {
    expect(outline(['.k.', 'kak', '.k.'], 'k')).toEqual(['.k.', 'kak', '.k.']);
  });
});

describe('gridOrigin', () => {
  test('сітка менша за полотно — по центру, вирівняно до пікселя', () => {
    expect(gridOrigin({ w: 14, h: 14, cell: 4 }, ['...', '...', '...'])).toEqual({ x: 1, y: 1 });
    expect(gridOrigin({ w: 48, h: 48, cell: 4 }, Array(12).fill('.'.repeat(12)))).toEqual({ x: 0, y: 0 });
  });
});

describe('paintGrid', () => {
  test('малює кожну непрозору клітинку кольором з палітри зі зсувом і масштабом', () => {
    const g = fakeGraphics();
    paintGrid(g, ['a.', '.b'], { a: 0x111111, b: 0x222222 }, { x: 10, y: 0, cell: 4 });
    expect(g.rects).toEqual([
      { x: 10, y: 0, w: 4, h: 4, color: 0x111111 },
      { x: 14, y: 4, w: 4, h: 4, color: 0x222222 },
    ]);
  });
});

describe('спрайти', () => {
  test('ключі унікальні', () => {
    const keys = SPRITES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test.each(SPRITES.map((s) => [s.key, s]))('%s: сітки й анімації коректні', (key, sprite) => {
    expect(validateSprite(sprite)).toEqual([]);
  });

  test('потрібні грі текстури є', () => {
    const keys = SPRITES.map((s) => s.key);
    for (const k of ['slime', 'wall', 'spike', 'projectile', 'lion', 'bat', 'plant', 'plantBullet', 'spider', 'smallSpider', 'shadow', 'heart']) {
      expect(keys).toContain(k);
    }
  });

  test('розміри полотен такі самі, як були (хітбокси не міняються)', () => {
    const size = Object.fromEntries(SPRITES.map((s) => [s.key, [s.w, s.h]]));
    expect(size).toMatchObject({
      slime: [48, 48], wall: [60, 64], spike: [40, 40], projectile: [16, 16], lion: [56, 56], bat: [40, 28],
      plant: [44, 44], plantBullet: [14, 14], spider: [120, 100], smallSpider: [28, 22], shadow: [120, 40], heart: [32, 28],
    });
  });

  test('кадри, на які посилається код гри, існують', () => {
    const byKey = Object.fromEntries(SPRITES.map((s) => [s.key, s]));
    const need = { slime: ['idle', 'jump'], lion: ['run', 'bite'], bat: ['fly'], plant: ['idle', 'shoot'], smallSpider: ['crawl'], spider: ['legs'] };
    for (const [key, anims] of Object.entries(need)) {
      for (const a of anims) expect(byKey[key].anims?.[a], `${key}:${a}`).toBeDefined();
    }
  });
});

describe('validateSprite', () => {
  const base = { key: 't', w: 8, h: 8, cell: 4, palette: { a: 1 } };
  test('ловить нерівні рядки, невідомий колір, вихід за полотно і зайвий кадр в анімації', () => {
    const errs = validateSprite({
      ...base,
      frames: { one: ['a.', 'a'], two: ['ab', 'aa'], big: ['aaa', 'aaa'] },
      anims: { x: { frames: ['one', 'nope'], fps: 2 } },
    });
    expect(errs.join('\n')).toMatch(/one.*довжин/);
    expect(errs.join('\n')).toMatch(/two.*'b'/);
    expect(errs.join('\n')).toMatch(/big.*полотн/);
    expect(errs.join('\n')).toMatch(/nope/);
  });
  test('спрайт із власною функцією draw замість сіток — валідний', () => {
    expect(validateSprite({ key: 's', w: 4, h: 4, draw: () => {} })).toEqual([]);
  });
  test('frameNames — порядок кадрів у стрічці', () => {
    expect(frameNames({ frames: { b: [], a: [] } })).toEqual(['b', 'a']);
  });
});

describe('фони', () => {
  test.each(BACKGROUNDS.map((b) => [b.key, b]))('%s: детермінований і в межах палітри', (key, bg) => {
    const a = fakeGraphics();
    const b = fakeGraphics();
    bg.draw(a, 120, 80);
    bg.draw(b, 120, 80);
    expect(a.rects.length).toBeGreaterThan(0);
    expect(a.rects).toEqual(b.rects);
    for (const r of a.rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(120);
    }
    expect(bg.parallax).toBeGreaterThan(0);
    expect(bg.parallax).toBeLessThan(1);
  });
});

test('src/art/* (крім textures.js і overrides.js) не імпортує Phaser — арт можна тестувати й міняти окремо', () => {
  const dir = join(import.meta.dirname, '..', 'src', 'art');
  const files = readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js') && !/textures\.js$|overrides\.js$/.test(f));
  expect(files.length).toBeGreaterThan(5);
  for (const f of files) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(/from\s+['"]phaser['"]/);
});

describe('frameOf (етап 11): номер кадру в стрічці за назвою', () => {
  test('номер = позиція в sprite.frames; невідома назва — 0', async () => {
    const { frameOf } = await import('../src/art/sprites/index.js');
    expect(frameOf('lavaDrop', 'swell1')).toBe(0);
    expect(frameOf('lavaDrop', 'run')).toBe(2);
    expect(frameOf('salamander', 'breathe')).toBe(2);
    expect(frameOf('kazan', 'nope')).toBe(0);
  });
});
