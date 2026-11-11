import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.bat;

/** Кажан: з'являється над екраном і щокадру летить прямо до гравця. Шкода — тільки дотиком. */
export default class Bat extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('bat');
    const minX = BALANCE.wallWidth + tex.width / 2;
    const x = Phaser.Math.FloatBetween(minX, width - minX);
    super(scene, x, -tex.height / 2, 'bat', 'bat');
    this.scrollsWithWorld = false;
    // різний стартовий кадр — зграя не махає крилами синхронно
    this.play({ key: animKey('bat', 'fly'), startFrame: Phaser.Math.Between(0, 1) });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const p = this.scene.player;
    // світ пізніше мчить униз швидше — кажан пришвидшується разом із ним, інакше на фоні стін він ніби завмирає
    const extra = CFG.scrollK * Math.max(this.scene.currentScroll - BALANCE.scrollBase, 0);
    const speed = (CFG.speed + extra) * this.speedMul(this.scene.nowMs);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    this.setFlipX(p.x < this.x);
  }
}
