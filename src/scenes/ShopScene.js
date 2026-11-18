import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { browserStorage } from '../systems/HighScore.js';
import { buySkin, equipSkin, loadMeta, saveMeta } from '../systems/Meta.js';
import { sfx } from '../systems/Audio.js';
import { AD_MODE, REWARD_STEPS } from '../config/ads.js';
import { canWatchRewarded, grantReward, rewardCooldownLeftMs } from '../systems/Ads.js';
import { showRewarded } from '../ads/AdService.js';
import { backButton, button, rebuildOnResize, textStyle } from './ui.js';

const ROW_H = 170;
const ICON_X = 130;

/** Магазин скінів: купити за Шаги, вдягнути куплений. Скіни лише візуальні. */
export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    rebuildOnResize(this, Phaser);
    this.storage = browserStorage();
    this.adBusy = false;
    this.meta = loadMeta(this.storage);
    this.draw();
  }

  /** Перемалювати весь екран (після купівлі чи зміни скіна). */
  draw() {
    this.children.removeAll(true);
    this.adTimer?.remove(false);
    const { width, height } = this.scale;
    const cx = width / 2;
    const meta = this.meta;
    this.add.text(cx, height * 0.06, 'Магазин', textStyle(64, '#9cff57')).setOrigin(0.5);
    this.add.text(cx, height * 0.12, `Шаги: ${meta.steps}`, textStyle(40, '#ffd84a')).setOrigin(0.5);

    const top = height * 0.2;
    BALANCE.meta.skins.forEach((skin, i) => {
      const y = top + i * ROW_H;
      const owned = meta.owned.includes(skin.id);
      const worn = meta.skin === skin.id;
      this.add.rectangle(cx, y, width - 60, ROW_H - 16, worn ? 0x2a4a2a : 0x000000, worn ? 0.7 : 0.35);
      this.add.image(ICON_X, y, skin.sprite).setScale(2.2);
      this.add.text(ICON_X + 80, y - 30, skin.name, { ...textStyle(32), align: 'left', wordWrap: { width: width - 470 } }).setOrigin(0, 0.5);
      if (!owned) this.add.text(ICON_X + 80, y + 26, `${skin.price} Шагів`, { ...textStyle(28, '#ffd84a'), align: 'left' }).setOrigin(0, 0.5);

      const bx = width - 140;
      if (worn) {
        this.add.text(bx, y, 'Вдягнено', textStyle(30, '#9cff57')).setOrigin(0.5);
      } else if (owned) {
        button(this, bx, y, 'Вдягнути', () => this.update_(equipSkin(this.meta, skin.id)), '#cfe8cf', 30);
      } else {
        const can = meta.steps >= skin.price;
        button(this, bx, y, 'Купити', () => this.buy(skin.id), can ? '#ffd84a' : '#6a6a6a', 30);
      }
    });
    if (AD_MODE !== 'off') this.drawAdButton(cx, height * 0.84);
    backButton(this);
  }

  /** Кнопка «Реклама: +50 Шагів» (фідбек-7); під кулдауном — сіра з відліком. */
  drawAdButton(x, y) {
    const now = Date.now();
    if (!canWatchRewarded(this.meta, now)) {
      const sec = Math.ceil(rewardCooldownLeftMs(this.meta, now) / 1000);
      this.add.text(x, y, `Реклама через ${sec} с`, { ...textStyle(30, '#6a6a6a'), backgroundColor: '#00000066', padding: { x: 24, y: 12 } }).setOrigin(0.5);
      this.adTimer = this.time.delayedCall(1000, () => {
        if (!this.adBusy) this.draw();
      });
      return;
    }
    button(this, x, y, `Реклама: +${REWARD_STEPS} Шагів`, () => this.watchAd(), '#ffd84a', 30);
  }

  watchAd() {
    if (this.adBusy) return; // під час ролика повторний тап ігноруємо
    this.adBusy = true;
    showRewarded(this).then((ok) => {
      this.adBusy = false;
      // перебудова екрана посеред ролика дає false — нагороди немає; активна сцена й ok — нараховуємо раз
      if (ok && this.sys.isActive()) {
        sfx('levelUp');
        this.update_(grantReward(this.meta, Date.now()));
      }
    });
  }

  buy(id) {
    const r = buySkin(this.meta, id);
    if (!r.ok) {
      sfx('hurt'); // не вистачає Шагів
      return;
    }
    sfx('levelUp');
    this.update_(r.meta);
  }

  update_(meta) {
    this.meta = meta;
    saveMeta(this.storage, meta);
    this.draw();
  }
}
