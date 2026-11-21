import Projectile from './Projectile.js';

/** Стріла лучника (біом 5): летить по прямій у точку гравця на момент пострілу, повернута за польотом. */
export default class Arrow extends Projectile {
  constructor(scene, x, y) {
    super(scene, x, y, 'arrow');
    this.setScale(1.6); // 24×8 — дрібна, на телефоні губилась
  }

  launch(tx, ty, speed, hitboxMul) {
    super.launch(tx, ty, speed, hitboxMul);
    this.setRotation(Math.atan2(ty - this.y, tx - this.x));
    return this;
  }
}
