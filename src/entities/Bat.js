import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.bat;

/**
 * Кажан: з'являється над екраном і щокадру летить прямо до гравця. Шкода — тільки дотиком.
 * biome — 'winter' / 'bamboo' (етапи 6a, 9): HP і швидкість з BALANCE.<біом>.bat; печера — як була.
 */
export default class Bat extends Enemy {
  constructor(scene, { biome = 'cave' } = {}) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('bat');
    const minX = BALANCE.wallWidth + tex.width / 2;
    const x = Phaser.Math.FloatBetween(minX, width - minX);
    super(scene, x, -tex.height / 2, 'bat', 'bat');
    this.scrollsWithWorld = false;
    const cfg = BALANCE[biome]?.bat;
    this.winterMul = cfg ? cfg.speedMul : 1;
    if (cfg) this.setBaseHp(cfg.hp);
    // різний стартовий кадр — зграя не махає крилами синхронно
    this.play({ key: animKey('bat', 'fly'), startFrame: Phaser.Math.Between(0, 1) });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const p = this.scene.player;
    // світ пізніше мчить униз швидше — кажан пришвидшується разом із ним, інакше на фоні стін він ніби завмирає
    const extra = CFG.scrollK * Math.max(this.scene.currentScroll - BALANCE.scrollBase, 0);
    const speed = (CFG.speed + extra) * this.winterMul * this.speedMul(this.scene.nowMs);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    this.setFlipX(p.x < this.x);
  }
}
