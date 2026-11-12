import Projectile from './Projectile.js';

/** Крапля магми Казана (етап 11): летить по прямій туди, де був гравець (як слиз Колі). */
export default class MagmaDrop extends Projectile {
  constructor(scene, x, y) {
    super(scene, x, y, 'magma');
    this.type = 'magma';
  }
}
