import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.smallSpider;

/** Павучок від боса: повзе прямо до гравця. */
export default class SmallSpider extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'smallSpider', 'smallSpider');
    this.scrollsWithWorld = false;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const p = this.scene.player;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    this.scene.physics.velocityFromRotation(angle, CFG.speed * this.speedMul(this.scene.nowMs), this.body.velocity);
  }
}
