import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { sfx } from '../systems/Audio.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.lion;

/**
 * Левиця: з'являється під нижнім краєм на стіні, де гравця немає, і біжить по ній угору (відносно екрана).
 * Коли вона на lungeBelowPx нижче за гравця — завмирає і блимає windupMs (попередження),
 * потім стрибає в точку, де гравець у момент стрибка, і на відстані biteRangePx клацає пащею.
 * Промахнулась — летить далі за екран.
 */
export default class Lion extends Enemy {
  constructor(scene, side) {
    const { width, height } = scene.scale;
    const tex = scene.textures.get('lion').getSourceImage();
    const x = side === 'left' ? BALANCE.wallWidth + tex.height / 2 : width - BALANCE.wallWidth - tex.height / 2;
    super(scene, x, height + tex.width / 2, 'lion', 'lion');
    this.side = side;
    this.scrollsWithWorld = false;
    this.lunging = false;
    this.bitten = false;
    // спрайт намальований боком (морда праворуч); на стіні — мордою вгору, лапами до стіни
    this.setRotation(-Math.PI / 2);
    this.setFlipY(side === 'left');
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const mul = this.speedMul(scene.nowMs);
    const p = scene.player;

    if (!this.lunging && this.windupUntil === undefined) {
      this.body.setVelocity(0, -CFG.speed * mul);
      if (this.y <= p.baseY + CFG.lungeBelowPx) {
        this.windupUntil = scene.nowMs + CFG.windupMs;
        this.body.setVelocity(0, 0);
        this.setScale(1, 0.85); // присіла перед стрибком
        this.windupTween = scene.tweens.add({ targets: this, alpha: 0.4, duration: CFG.windupMs / 4, yoyo: true, repeat: 1 });
      }
    } else if (!this.lunging) {
      if (scene.nowMs >= this.windupUntil) {
        this.lunging = true;
        this.setAlpha(1).setScale(1);
        this.lungeDir = new Phaser.Math.Vector2(p.x - this.x, p.y - this.y).normalize();
        this.setRotation(this.lungeDir.angle());
        this.setFlipY(this.lungeDir.x < 0);
      }
    } else {
      this.body.setVelocity(this.lungeDir.x * CFG.lungeSpeed * mul, this.lungeDir.y * CFG.lungeSpeed * mul);
      if (!this.bitten && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < CFG.biteRangePx) {
        this.bitten = true;
        this.setTexture('lionBite');
        sfx('bite');
      }
      if (this.isOffscreen()) this.destroy();
    }
  }
}
