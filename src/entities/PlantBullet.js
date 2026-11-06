import Projectile from './Projectile.js';

/** Куля рослини: повільна, летить по прямій у точку, де гравець був у момент пострілу (від неї можна ухилитись). */
export default class PlantBullet extends Projectile {
  constructor(scene, x, y) {
    super(scene, x, y, 'plantBullet');
  }
}
