import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.bat;
const WINTER_TINT = 0xb8dcff; // «Зимова летюча миша» (етап 10): той самий спрайт, холодний відтінок

/**
 * Кажан: з'являється над екраном і щокадру летить прямо до гравця. Шкода — тільки дотиком.
 * biome — 'winter' / 'bamboo' (етапи 6a, 9): HP і швидкість з BALANCE.<біом>.bat; печера — як була.
 * У зимі це «Зимова летюча миша» (етап 10): HP 6 і холодний відтінок.
 * Посилений (коло 1+, §10.1): на diveAtPx від гравця раз зависає hoverMs і пікірує в точку гравця, вже не доворачуючи.
 * x, y — де з'явитися (миші, що прилітають на допомогу ведмедю); за замовчуванням — над екраном.
 */
export default class Bat extends Enemy {
  constructor(scene, { biome = 'cave', x, y } = {}) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('bat');
    const minX = BALANCE.wallWidth + tex.width / 2;
    super(scene, x ?? Phaser.Math.FloatBetween(minX, width - minX), y ?? -tex.height / 2, 'bat', 'bat');
    this.scrollsWithWorld = false;
    const cfg = BALANCE[biome]?.bat;
    this.winterMul = cfg ? cfg.speedMul : 1;
    if (cfg) this.setBaseHp(cfg.hp);
    this.variant = biome === 'winter' ? 'winterBat' : 'bat';
    if (biome === 'winter' && !this.trait) this.setBaseTint(WINTER_TINT);
    this.dive = null; // { hoverUntil, vx, vy } — пікірування посиленого
    // різний стартовий кадр — зграя не махає крилами синхронно
    this.play({ key: animKey('bat', 'fly'), startFrame: Phaser.Math.Between(0, 1) });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const p = scene.player;
    const now = scene.nowMs;
    // світ пізніше мчить униз швидше — кажан пришвидшується разом із ним, інакше на фоні стін він ніби завмирає
    const extra = CFG.scrollK * Math.max(scene.currentScroll - BALANCE.scrollBase, 0);
    const speed = (CFG.speed + extra) * this.winterMul * this.speedMul(now);
    const t = this.trait;
    if (t && !this.dive && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < t.diveAtPx) {
      this.dive = { hoverUntil: now + t.hoverMs, angle: 0 };
    }
    if (this.dive) {
      if (now < this.dive.hoverUntil) {
        this.body.setVelocity(0, 0);
        this.dive.angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
        return;
      }
      scene.physics.velocityFromRotation(this.dive.angle, speed * t.diveSpeedMul, this.body.velocity);
      if (this.isOffscreen()) this.destroy();
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    this.setFlipX(p.x < this.x);
  }
}
