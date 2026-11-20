import { BALANCE } from '../config/balance.js';
import { createPath, pointAt } from '../systems/Snake.js';
import { rideHit, rideZigzag } from '../systems/Forms.js';
import { sfx } from '../systems/Audio.js';

const T = BALANCE.forms.train;

/**
 * Паровоз «Я ШКОДЬКО» (фідбек-8): слизак сідає в паровоз і T.ms їде автопілотом змійкою по екрану (рядами від стіни
 * до стіни, вниз до висоти гравця й назад), як потяг Шкодька в бою. Дрібних ворогів на дотик ваншотить, босу — T.bossDamage
 * не частіше T.bossHitCdMs. Лише картинки, зіткнення — за відстанями. step(dt) → false, коли поїздка скінчилась.
 */
export default class RideTrain {
  constructor(scene, riderTexture) {
    this.scene = scene;
    this.until = scene.nowMs + T.ms;
    this.loco = scene.add.image(-200, -200, 'loco').setScale(T.carScale).setDepth(7);
    this.cars = [this.loco];
    for (let i = 0; i < T.cars; i++) this.cars.push(scene.add.image(-200, -200, 'wagon').setScale(T.carScale).setDepth(7));
    this.rider = scene.add.image(-200, -200, riderTexture, 0).setScale(0.6).setDepth(8);
    const half = this.loco.displayWidth / 2;
    const wall = BALANCE.wallWidth;
    const { width } = scene.scale;
    const x0 = wall + half;
    const x1 = width - wall - half;
    // старт — біля стіни гравця на верхньому ряду
    const [a, b] = scene.player.side === 'left' ? [x0, x1] : [x1, x0];
    const bottom = scene.player.baseY ?? scene.player.y;
    this.path = createPath(rideZigzag(a, b, T.top, bottom, T.rowGap, (T.speed * T.ms) / 1000 + 400));
    this.spacing = this.loco.displayWidth + 6;
    this.d = (T.cars + 1) * this.spacing; // увесь потяг одразу на шляху
    this.hitAt = new WeakMap();
    sfx('whistle');
  }

  step(dt, enemies) {
    const scene = this.scene;
    const now = scene.nowMs;
    if (now >= this.until) {
      this.destroy();
      return false;
    }
    this.d += (T.speed * dt) / 1000;
    this.cars.forEach((c, i) => {
      const p = pointAt(this.path, this.d - i * this.spacing);
      const vertical = Math.abs(Math.sin(p.angle)) > 0.7;
      c.setPosition(p.x, p.y).setFlipX(Math.cos(p.angle) > 0.01 && !vertical).setRotation(vertical ? p.angle + Math.PI : 0);
    });
    this.rider.setPosition(this.loco.x, this.loco.y - this.loco.displayHeight * 0.55);
    const r = this.loco.displayHeight / 2;
    for (const e of enemies) {
      if (!e.active || e.hp <= 0 || e.invulnerable) continue;
      const er = Math.min(e.displayWidth, e.displayHeight) / 2;
      if (!this.cars.some((c) => Math.hypot(c.x - e.x, c.y - e.y) < r + er)) continue;
      const kind = rideHit(e, this.hitAt.get(e), now);
      if (kind === 'kill') e.takeHit(e.hp, null, now);
      else if (kind === 'boss') {
        this.hitAt.set(e, now);
        e.takeHit(T.bossDamage, null, now);
        sfx('hit');
      }
    }
    return true;
  }

  destroy() {
    for (const c of this.cars) c.destroy();
    this.rider.destroy();
  }
}
