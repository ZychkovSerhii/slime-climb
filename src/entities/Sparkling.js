import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.sparkling;

/** Дрібна іскра (лава, §11.2): уламок іскри, летить по прямій під кутом angle і гасне через lifeMs. */
export default class Sparkling extends Enemy {
  constructor(scene, x, y, angle) {
    super(scene, x, y, 'sparkling', 'sparkling');
    this.scrollsWithWorld = false;
    this.sparkling = true;
    this.angle0 = angle;
    this.dieAt = scene.nowMs + CFG.lifeMs;
  }

  spawned() {
    const v = CFG.speed * this.loopSpeed;
    this.body.setVelocity(Math.cos(this.angle0) * v, Math.sin(this.angle0) * v);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    const left = this.dieAt - this.scene.nowMs;
    if (left < 400) this.setAlpha(Math.max(left / 400, 0));
    if (left <= 0 || this.isOffscreen()) this.destroy();
  }
}
