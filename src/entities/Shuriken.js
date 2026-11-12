import Projectile from './Projectile.js';

const SPIN = 0.02; // рад/мс

/** Сюрикен ніндзі: летить по прямій туди, де був гравець, і крутиться. */
export default class Shuriken extends Projectile {
  constructor(scene, x, y) {
    super(scene, x, y, 'shuriken');
    this.type = 'shuriken';
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.active) this.rotation += SPIN * delta;
  }
}
