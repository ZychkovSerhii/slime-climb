import { BALANCE } from '../config/balance.js';
import { archerMayFire, riderSpiderDead } from '../systems/Grass.js';
import { sfx } from '../systems/Audio.js';
import HairySpider from './HairySpider.js';
import Archer, { shootArrow } from './Archer.js';

const A = BALANCE.enemies.archer;

/**
 * Лучник верхи на Волохані (біом 5, з 30-ї с): павук поводиться як звичайний Волохань, лучник на ньому стріляє раз на
 * fireMs (коли вище за гравця). HP разом (rider.hp); щойно знято rider.spiderHp — павук гине (нагорода за павука),
 * а лучник зіскакує на стіну, де гравця немає, і лишається з рештою HP (рішення користувача).
 */
export default class Rider extends HairySpider {
  constructor(scene, side) {
    super(scene, side, 'rider');
    this.rider = true;
    this.maxHp = this.hp;
    this.nextShotAt = scene.nowMs + A.firstShotMs;
    this.archerImg = scene.add.image(this.x, this.y, 'archer').setDepth(this.depth + 0.5).setScale(0.8);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    this.archerImg.setPosition(this.x, this.y - 10).setFlipX(this.x > scene.scale.width / 2).setAlpha(this.alpha);
    if (now >= this.nextShotAt && this.isOnScreen() && archerMayFire(this.y, scene.player.y)) {
      this.nextShotAt = now + A.fireMs / Math.max(this.speedMul(now), 0.25);
      shootArrow(scene, this.x, this.y);
    }
  }

  takeHit(damage, fx, nowMs) {
    super.takeHit(damage, fx, nowMs);
    if (!this.active || !riderSpiderDead(this.hp, this.maxHp)) return;
    const scene = this.scene;
    // павук гине: нагорода як за Волоханя; лучник лишається на стіні, де гравця немає, у смузі лучника
    scene.events.emit('enemy:killed', { type: 'hairySpider', x: this.x, y: this.y });
    sfx('kill');
    const side = scene.player.side === 'left' ? 'right' : 'left';
    const archer = scene.spawnEnemy(new Archer(scene, side, Math.min(Math.max(this.y, 0), scene.scale.height * A.maxYFrac)));
    archer.hp = this.hp;
    this.destroy();
  }

  destroy(fromScene) {
    this.archerImg?.destroy();
    this.archerImg = null;
    super.destroy(fromScene);
  }
}
