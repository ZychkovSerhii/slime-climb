// Реєстр спрайтів. Новий спрайт: файл у цій папці + рядок тут.
// Замінити готовим малюнком: поклади <key>.png у src/art/png/ (див. src/art/README.md).
import slime from './slime.js';
import wall from './wall.js';
import spike from './spike.js';
import projectile from './projectile.js';
import plantBullet from './plantBullet.js';
import heart from './heart.js';
import bat from './bat.js';
import plant from './plant.js';
import lion from './lion.js';
import spider from './spider.js';
import smallSpider from './smallSpider.js';
import shadow from './shadow.js';

export const SPRITES = [slime, wall, spike, projectile, plantBullet, heart, bat, plant, lion, spider, smallSpider, shadow];

/** Ключ анімації в Phaser: 'slime:idle'. */
export const animKey = (spriteKey, anim) => `${spriteKey}:${anim}`;
