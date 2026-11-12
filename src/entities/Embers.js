import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

const E = BALANCE.lava.embers;
const WORLD_K = 0.4; // як сніг: трохи їдуть разом зі світом
const DEPTH = -2; // над фоном (−3), під стінами (−1) і всім іншим

/** Іскри на фоні лави (етап 11): повільно піднімаються, як сніг навпаки. Вимикаються в меню. */
export default class Embers {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.sparks = Array.from({ length: E.count }, () => {
      const f = scene.add.image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'ember');
      f.setAlpha(E.alpha * Phaser.Math.FloatBetween(0.5, 1)).setDepth(DEPTH);
      f.speed = Phaser.Math.FloatBetween(E.speedMin, E.speedMax);
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
    for (const f of this.sparks) {
      f.y += -(f.speed * dt) / 1000 + dy * WORLD_K;
      f.x = f.baseX + Math.sin(this.t * 1.3 + f.phase) * 6;
      if (f.y < -8 || f.y > height + 8) {
        f.y = f.y < 0 ? height + 8 : -8;
        f.baseX = Phaser.Math.Between(0, width);
      }
    }
  }

  destroy() {
    for (const f of this.sparks) f.destroy();
    this.sparks = [];
  }
}
