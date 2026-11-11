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
import axe from './axe.js';
import shotgun from './shotgun.js';
import chakraVeins from './chakraVeins.js';
import webBall from './webBall.js';
import hat from './hat.js';
import webShot from './webShot.js';
import slimeSpider from './slimeSpider.js';
import frost from './frost.js';
import skinAssassin from './skinAssassin.js';
import skinCommander from './skinCommander.js';
import skinRaccoon from './skinRaccoon.js';
import skinMurzik from './skinMurzik.js';
import wallIce from './wallIce.js';
import icicle from './icicle.js';
import elf from './elf.js';
import candy from './candy.js';
import bear from './bear.js';
import penguin from './penguin.js';
import santa from './santa.js';
import gift from './gift.js';
import snowflake from './snowflake.js';
import shkodko from './shkodko.js';
import giftBomb from './giftBomb.js';
import { wagon, loco } from './train.js';
import slimeShkodko from './slimeShkodko.js';
import sack from './sack.js';

export const SPRITES = [slime, wall, spike, projectile, plantBullet, heart, bat, plant, lion, spider, smallSpider, shadow, axe, shotgun, chakraVeins, webBall, hat, webShot, slimeSpider, frost, skinAssassin, skinCommander, skinRaccoon, skinMurzik,
  wallIce, icicle, elf, candy, bear, penguin, santa, gift, snowflake,
  shkodko, giftBomb, wagon, loco,
  slimeShkodko, sack];

/** Ключ анімації в Phaser: 'slime:idle'. */
export const animKey = (spriteKey, anim) => `${spriteKey}:${anim}`;
