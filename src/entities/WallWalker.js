import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';

/**
 * Ходок по стіні (фідбек-3): ведмідь і пінгвіни. Стоїть на внутрішньому краї стіни side, лапами до стіни,
 * і рухається лише вздовж неї. Підклас задає worldSpeed(now) — швидкість відносно світу (+ — угору),
 * обов'язково в межах WallWalkers.walkerSpeedRange: на цьому тримається інваріант «безпечна стіна».
 * facing: 'up' (лізе вгору) або 'down' (ковзає вниз) — куди дивиться спрайт, намальований мордою праворуч.
 */
export default class WallWalker extends Enemy {
  constructor(scene, side, y, texture, type, facing) {
    const tex = scene.textures.getFrame(texture);
    const { width } = scene.scale;
    // спрайт повернутий на 90°: уздовж стіни — його ширина, поперек — висота
    const x = side === 'left' ? BALANCE.wallWidth + tex.height / 2 : width - BALANCE.wallWidth - tex.height / 2;
    super(scene, x, y, texture, type);
    this.side = side;
    this.walker = true;
    this.scrollsWithWorld = false;
    this.halfLen = tex.width / 2;
    if (facing === 'up') {
      this.setRotation(-Math.PI / 2);
      this.setFlipY(side === 'left');
    } else {
      this.setRotation(Math.PI / 2);
      this.setFlipY(side === 'right');
    }
  }

  /** Після додавання в групу: тіло — під повернутий спрайт. */
  spawned() {
    const tex = this.scene.textures.getFrame(this.texture.key);
    this.body.setSize(tex.height, tex.width, true);
  }

  worldSpeed() {
    return 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    // на екрані: світ їде вниз зі швидкістю прокрутки, ходок рухається відносно нього
    this.body.setVelocity(0, this.scene.currentScroll - this.worldSpeed(this.scene.nowMs));
    if (this.y > this.scene.scale.height + this.halfLen + BALANCE.offscreenMarginPx) this.destroy();
  }
}
