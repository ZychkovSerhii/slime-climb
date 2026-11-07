import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.bat;

/** Кажан: з'являється над екраном і щокадру летить прямо до гравця. Шкода — тільки дотиком. */
export default class Bat extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.get('bat').getSourceImage();
    const minX = BALANCE.wallWidth + tex.width / 2;
    const x = Phaser.Math.FloatBetween(minX, width - minX);
    super(scene, x, -tex.height / 2, 'bat', 'bat');
    this.scrollsWithWorld = false;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const p = this.scene.player;
    const speed = CFG.speed * this.speedMul(this.scene.nowMs);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    this.setFlipX(p.x < this.x);
  }
}
