import Projectile from './Projectile.js';

/** Крапля слизу Колі, його уламків і личинок-стрільців: летить по прямій туди, де був гравець. */
export default class SlimeSpit extends Projectile {
  constructor(scene, x, y) {
    super(scene, x, y, 'slimeSpit');
    this.type = 'spit';
  }
}
