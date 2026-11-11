import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

const S = BALANCE.winter.snow;
const WORLD_K = 0.4; // сніг трохи «їде» разом зі світом — інакше на швидкій прокрутці він ніби летить угору
const DEPTH = -2; // над фоном (−3), під стінами (−1) і всім іншим

/** Снігопад: кілька десятків тьмяних сніжинок. Без фізики — рух вручну в step(). */
export default class Snow {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.flakes = Array.from({ length: S.count }, () => {
      const f = scene.add.image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'snowflake');
      f.setAlpha(S.alpha * Phaser.Math.FloatBetween(0.6, 1)).setDepth(DEPTH);
      f.speed = Phaser.Math.FloatBetween(S.minSpeed, S.maxSpeed);
      f.phase = Math.random() * Math.PI * 2;
      f.baseX = f.x;
      return f;
    });
    this.t = 0;
  }

  /** dt — мс, dy — на скільки світ проїхав за кадр. */
  step(dt, dy) {
    const { width, height } = this.scene.scale;
    this.t += dt / 1000;
    for (const f of this.flakes) {
      f.y += (f.speed * dt) / 1000 + dy * WORLD_K;
      f.x = f.baseX + Math.sin(this.t + f.phase) * S.drift;
      if (f.y > height + 8) {
        f.y = -8;
        f.baseX = Phaser.Math.Between(0, width);
      }
    }
  }

  destroy() {
    for (const f of this.flakes) f.destroy();
    this.flakes = [];
  }
}
