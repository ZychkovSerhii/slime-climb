import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.sparkling;

/**
 * Дрібна іскра (лава, §11.2): уламок іскри. Фідбек-8: не гасне й летить на гравця; ближче homingStopPx перестає
 * доворачувати і йде по прямій — від неї рятує стрибок. Зникає, лише вилетівши за край або вбита.
 */
export default class Sparkling extends Enemy {
  constructor(scene, x, y, angle) {
    super(scene, x, y, 'sparkling', 'sparkling');
    this.scrollsWithWorld = false;
    this.sparkling = true;
    this.angle0 = angle;
    this.homing = true;
  }

  spawned() {
    const v = CFG.speed * this.loopSpeed;
    this.body.setVelocity(Math.cos(this.angle0) * v, Math.sin(this.angle0) * v);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active || !this.body) return;
    const p = this.scene.player;
    if (this.homing && p) {
      if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= CFG.homingStopPx) this.homing = false;
      else {
        const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
        this.scene.physics.velocityFromRotation(a, CFG.speed * this.speedMul(this.scene.nowMs), this.body.velocity);
      }
    }
    if (this.isOffscreen()) this.destroy();
  }
}
