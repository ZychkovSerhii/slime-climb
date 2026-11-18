import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

/**
 * Снаряд: летить по прямій у точку цілі на момент пострілу.
 * Рухається відносно екрана (не їде зі світом), знищується за межами екрана.
 */
export default class Projectile extends Phaser.Physics.Arcade.Image {
  /** fx — ефекти влучання для ворога (systems/Skills.hitEffects) або null. */
  /** bounceMul (етап 14, рикошет дробовика) — раз відскочити від стіни з шкодою ×bounceMul; null — без рикошету. */
  constructor(scene, x, y, texture, { damage = 0, fx = null, bounceMul = null } = {}) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    this.damage = damage;
    this.fx = fx;
    this.bounceMul = bounceMul;
    this.scrollsWithWorld = false;
  }

  /** Запуск у точку (tx, ty). Викликати після додавання у фізичну групу. */
  launch(tx, ty, speed, hitboxMul = 1) {
    if (hitboxMul !== 1) {
      // коло хітбокса більше за текстуру, з центром там само
      const r = (Math.min(this.width, this.height) / 2) * hitboxMul;
      this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    return this;
  }

  preUpdate(time, delta) {
    const m = BALANCE.offscreenMarginPx;
    const { width, height } = this.scene.scale;
    if (this.bounceMul !== null && this.body) {
      const v = this.body.velocity;
      const left = this.x <= BALANCE.wallWidth && v.x < 0;
      const right = this.x >= width - BALANCE.wallWidth && v.x > 0;
      if (left || right) {
        v.x = -v.x;
        this.damage *= this.bounceMul;
        this.bounceMul = null;
        this.setAlpha(0.7); // рикошет видно: блідіший
      }
    }
    if (this.x < -m || this.x > width + m || this.y < -m || this.y > height + m) this.destroy();
  }
}
