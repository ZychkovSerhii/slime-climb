import * as Phaser from 'phaser';
// Шар між описами арту (src/art/*) і Phaser: генерує текстури-стрічки кадрів, підміняє PNG, реєструє анімації.
import { frameNames, gridOrigin } from './grid.js';
import { paintGrid } from './paint.js';
import { SPRITES, animKey } from './sprites/index.js';
import { BACKGROUNDS } from './backgrounds/index.js';
import { PNG_OVERRIDES } from './overrides.js';

const PNG_PREFIX = 'png:';

/** BootScene.preload: ставить у чергу PNG-заміни. */
export function preloadArt(scene) {
  for (const [key, url] of Object.entries(PNG_OVERRIDES)) scene.load.image(PNG_PREFIX + key, url);
}

/** BootScene.create: усі текстури спрайтів і фонів + анімації. */
export function buildArt(scene) {
  for (const sprite of SPRITES) buildSprite(scene, sprite);
  for (const bg of BACKGROUNDS) buildBackground(scene, bg);
  for (const sprite of SPRITES) registerAnims(scene, sprite);
}

/**
 * Текстура спрайта — стрічка кадрів по горизонталі (кадр i: x = i*w). Кадр 0 — типовий,
 * тож textures.getFrame(key) дає розмір одного кадру.
 * PNG-заміна має бути такою самою стрічкою: ширина = кадрів × w, висота = h; інакше — попередження і сітка.
 */
function buildSprite(scene, sprite) {
  const names = sprite.draw ? ['base'] : frameNames(sprite);
  const stripW = sprite.w * names.length;
  if (scene.textures.exists(sprite.key)) scene.textures.remove(sprite.key);

  if (!usePng(scene, sprite.key, stripW, sprite.h)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    if (sprite.draw) sprite.draw(g);
    else
      names.forEach((name, i) => {
        const rows = sprite.frames[name];
        const o = gridOrigin(sprite, rows);
        paintGrid(g, rows, sprite.palette, { x: i * sprite.w + o.x, y: o.y, cell: sprite.cell });
      });
    g.generateTexture(sprite.key, stripW, sprite.h);
    g.destroy();
  }

  const tex = scene.textures.get(sprite.key);
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST); // піксель-арт без розмиття
  names.forEach((name, i) => tex.add(i, 0, i * sprite.w, 0, sprite.w, sprite.h));
}

/** Перейменовує завантажену PNG у key, якщо розмір збігається. */
function usePng(scene, key, w, h) {
  const pngKey = PNG_PREFIX + key;
  if (!scene.textures.exists(pngKey)) return false;
  const img = scene.textures.get(pngKey).getSourceImage();
  if (img.width !== w || img.height !== h) {
    console.warn(`[art] ${key}.png: очікувався розмір ${w}×${h}, а він ${img.width}×${img.height} — беру намальований кодом`);
    return false;
  }
  scene.textures.renameTexture(pngKey, key);
  return true;
}

function buildBackground(scene, bg) {
  if (scene.textures.exists(bg.key)) scene.textures.remove(bg.key);
  if (scene.textures.exists(PNG_PREFIX + bg.key)) {
    scene.textures.renameTexture(PNG_PREFIX + bg.key, bg.key);
  } else {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    bg.draw(g, bg.tileW, bg.tileH);
    g.generateTexture(bg.key, bg.tileW, bg.tileH);
    g.destroy();
  }
  scene.textures.get(bg.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}

function registerAnims(scene, sprite) {
  const names = frameNames(sprite);
  for (const [name, cfg] of Object.entries(sprite.anims ?? {})) {
    const key = animKey(sprite.key, name);
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: cfg.frames.map((f) => ({ key: sprite.key, frame: names.indexOf(f) })),
      frameRate: cfg.fps,
      repeat: cfg.repeat ?? 0,
    });
  }
}

export { animKey };
export const background = (key) => BACKGROUNDS.find((b) => b.key === key);
