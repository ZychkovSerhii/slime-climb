import { BALANCE } from '../config/balance.js';

const F = BALANCE.bamboo.fog;
// над фоном (−3), під стінами (−1), шипами, ворогами й снарядами: туман ніколи не ховає небезпеку
const DEPTHS = [-2.6, -2.4];

/**
 * Туман бамбука (етап 9, §9.1): 2 прозорі тайлові шари текстури 'fog' між стінами. Повільний паралакс
 * (частка прокрутки світу) і дрейф убік. Вимикається в меню (settings.fog). Без фізики.
 */
export default class Fog {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const w = BALANCE.wallWidth;
    this.layers = F.layers.map((cfg, i) => {
      const t = scene.add.tileSprite(width / 2, height / 2, width - 2 * w, height, 'fog').setDepth(DEPTHS[i]).setAlpha(cfg.alpha);
      t.tilePositionX = i * 170; // шари не збігаються
      t.cfg = cfg;
      return t;
    });
  }

  /** dt — мс, dy — на скільки світ проїхав за кадр. */
  step(dt, dy) {
    for (const t of this.layers) {
      t.tilePositionY -= dy * t.cfg.parallax;
      t.tilePositionX += (t.cfg.driftX * dt) / 1000;
    }
  }

  relayout() {
    const { width, height } = this.scene.scale;
    const w = BALANCE.wallWidth;
    for (const t of this.layers) t.setSize(width - 2 * w, height).setPosition(width / 2, height / 2);
  }

  /** Плавна поява/зникнення під час переходу біому. */
  fadeIn(ms) {
    for (const t of this.layers) {
      const a = t.cfg.alpha;
      t.setAlpha(0);
      this.scene.tweens.add({ targets: t, alpha: a, duration: ms });
    }
  }

  destroy() {
    for (const t of this.layers) t.destroy();
    this.layers = [];
  }
}
