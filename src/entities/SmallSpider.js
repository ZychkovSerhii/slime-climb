import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.smallSpider;

/**
 * Павучок від боса. Сам по собі повзе прямо до гравця;
 * у рої (controlled) швидкість йому задає Swarm, а дотик ще й отруює.
 */
export default class SmallSpider extends Enemy {
  constructor(scene, x, y, { controlled = false } = {}) {
    super(scene, x, y, 'smallSpider', 'smallSpider');
    this.scrollsWithWorld = false;
    this.controlled = controlled;
    this.poisons = controlled;
    this.play({ key: animKey('smallSpider', 'crawl'), startFrame: Phaser.Math.Between(0, 1) });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || this.controlled) return;
    const p = this.scene.player;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    this.scene.physics.velocityFromRotation(angle, CFG.speed * this.speedMul(this.scene.nowMs), this.body.velocity);
  }
}
