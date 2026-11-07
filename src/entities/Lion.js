import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.lion;

/**
 * Лев: з'являється під нижнім краєм на одній зі стін і біжить угору (відносно екрана).
 * На половині висоти екрана один раз кидається в точку, де зараз гравець, і летить далі по цій лінії за екран.
 */
export default class Lion extends Enemy {
  constructor(scene, side) {
    const { width, height } = scene.scale;
    const tex = scene.textures.get('lion').getSourceImage();
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, height + tex.height / 2, 'lion', 'lion');
    this.side = side;
    this.scrollsWithWorld = false;
    this.lunging = false;
    if (side === 'right') this.setFlipX(true);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const mul = this.speedMul(scene.nowMs);

    if (!this.lunging && this.windupUntil === undefined) {
      this.body.setVelocity(0, -CFG.speed * mul);
      if (this.y <= scene.scale.height / 2) {
        // попередження: лев завмирає і блимає windupMs, потім кидається туди, де гравець у момент ривка
        this.windupUntil = scene.nowMs + CFG.windupMs;
        this.body.setVelocity(0, 0);
        this.windupTween = scene.tweens.add({ targets: this, alpha: 0.4, duration: CFG.windupMs / 4, yoyo: true, repeat: 1 });
      }
    } else if (!this.lunging) {
      if (scene.nowMs >= this.windupUntil) {
        this.lunging = true;
        this.setAlpha(1);
        const p = scene.player;
        this.lungeDir = new Phaser.Math.Vector2(p.x - this.x, p.y - this.y).normalize();
      }
    } else {
      this.body.setVelocity(this.lungeDir.x * CFG.lungeSpeed * mul, this.lungeDir.y * CFG.lungeSpeed * mul);
      if (this.isOffscreen()) this.destroy();
    }
  }
}
