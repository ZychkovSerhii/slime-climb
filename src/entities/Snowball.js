import { BALANCE } from '../config/balance.js';
import { snowballScale } from '../systems/Biome.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.snowball;

/**
 * Снігова куля (зима, фідбек-6 п.15): з'являється над верхнім краєм на стіні side (де гравця немає) і котиться по ній
 * донизу швидше за світ (їде зі світом + своя швидкість), крутиться й росте від startScale до maxScale за growMs. Б'є дотиком; HP — CFG.hp × біом.
 * Скотилась за нижній край — зникає без нагороди.
 */
export default class Snowball extends Enemy {
  constructor(scene, side) {
    super(scene, 0, 0, 'snowball', 'snowball');
    this.side = side;
    this.snowball = true;
    this.scrollsWithWorld = true; // фідбек-8: їде зі світом і ще котиться донизу — на гравця, а не «вгору» відносно стіни
    this.bornAt = scene.nowMs;
    this.setScale(CFG.startScale);
    this.place(-this.displayHeight / 2);
  }

  /** x — впритул до стіни з урахуванням поточного розміру. */
  place(y) {
    const half = this.displayWidth / 2;
    const x = this.side === 'left' ? BALANCE.wallWidth + half : this.scene.scale.width - BALANCE.wallWidth - half;
    this.setPosition(x, y);
  }

  spawned() {
    this.body.setVelocity(0, CFG.speed * this.speedMul(this.scene.nowMs));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const now = this.scene.nowMs;
    const mul = this.speedMul(now);
    this.setScale(snowballScale(now - this.bornAt));
    this.place(this.y);
    this.body.setVelocity(0, CFG.speed * mul);
    // котиться вниз: ліва стіна — за годинниковою (у Phaser +), права — проти
    this.rotation += ((this.side === 'left' ? 1 : -1) * CFG.spinPerSec * mul * delta) / 1000;
    if (this.y - this.displayHeight / 2 > this.scene.scale.height) this.destroy();
  }
}
