// Реєстр спрайтів. Новий спрайт: файл у цій папці + рядок тут.
// Замінити готовим малюнком: поклади <key>.png у src/art/png/ (див. src/art/README.md).
import slime from './slime.js';
import wall from './wall.js';
import spike from './spike.js';
import projectile from './projectile.js';
import plantBullet from './plantBullet.js';
import heart from './heart.js';
import heartArmor from './heartArmor.js';
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
import wallBamboo from './wallBamboo.js';
import stake from './stake.js';
import ninja from './ninja.js';
import smoke from './smoke.js';
import shuriken from './shuriken.js';
import lantern from './lantern.js';
import kolya from './kolya.js';
import slug from './slug.js';
import slimeSpit from './slimeSpit.js';
import larva from './larva.js';
import slimeKolya from './slimeKolya.js';
import traitStar from './traitStar.js';
import wallLava from './wallLava.js';
import basalt from './basalt.js';
import salamander from './salamander.js';
import beam from './beam.js';
import spark from './spark.js';
import sparkling from './sparkling.js';
import lavaDrop from './lavaDrop.js';
import kazan from './kazan.js';
import lid from './lid.js';
import magma from './magma.js';
import bubble from './bubble.js';
import puddle from './puddle.js';
import ladle from './ladle.js';
import slimeKazan from './slimeKazan.js';
import ember from './ember.js';

export const SPRITES = [slime, wall, spike, projectile, plantBullet, heart, heartArmor, bat, plant, lion, spider, smallSpider, shadow, axe, shotgun, chakraVeins, webBall, hat, webShot, slimeSpider, frost, skinAssassin, skinCommander, skinRaccoon, skinMurzik,
  wallIce, icicle, elf, candy, bear, penguin, santa, gift, snowflake,
  shkodko, giftBomb, wagon, loco,
  slimeShkodko, sack,
  wallBamboo, stake, ninja, smoke, shuriken, lantern, kolya, slug, slimeSpit, larva, slimeKolya,
  traitStar,
  wallLava, basalt, salamander, beam, spark, sparkling, lavaDrop, kazan, lid, magma, bubble, puddle, ladle, slimeKazan, ember];

/** Ключ анімації в Phaser: 'slime:idle'. */
export const animKey = (spriteKey, anim) => `${spriteKey}:${anim}`;

/** Номер кадру name у стрічці текстури спрайта key (кадри в Phaser — числа, див. textures.js); невідомий — 0. */
export function frameOf(key, name) {
  const sprite = SPRITES.find((s) => s.key === key);
  const i = sprite ? Object.keys(sprite.frames ?? {}).indexOf(name) : -1;
  return Math.max(i, 0);
}
