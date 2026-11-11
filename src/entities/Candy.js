import Projectile from './Projectile.js';

const SPIN = 0.012; // рад/мс — льодяник крутиться в польоті

/** Льодяник-посох ельфа: летить по прямій у точку, де був гравець. */
export default class Candy extends Projectile {
  constructor(scene, x, y) {
    super(scene, x, y, 'candy');
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.active) this.rotation += SPIN * delta;
  }
}
