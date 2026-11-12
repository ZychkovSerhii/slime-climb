import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { blastHits } from '../systems/ShkodkoPlanner.js';
import { sfx } from '../systems/Audio.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.bubble;
const POP_COLOR = 0xffb347;

/**
 * Бульбашка кипіння Казана (етап 11, §11.3): повільно пливе до гравця; лопається від дотику (GameScene: дотик ворога —
 * мінус життя, і бульбашка зникає) або через lifeMs вибухом радіусом popPx. Прислужник: зникає зі смертю Казана.
 */
export default class Bubble extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'bubble', 'bubble');
    this.scrollsWithWorld = false;
    this.kazanMinion = true;
    this.popAt = scene.nowMs + CFG.lifeMs;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const p = scene.player;
    const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    scene.physics.velocityFromRotation(a, CFG.speed * this.speedMul(scene.nowMs), this.body.velocity);
    this.setScale(1 + 0.08 * Math.sin(scene.nowMs / 120));
    if (scene.nowMs >= this.popAt) this.pop();
  }

  /** Дотик до гравця теж лопає бульбашку. */
  onTouch() {
    this.scene.time.delayedCall(0, () => this.active && this.pop(false));
  }

  pop(blast = true) {
    const scene = this.scene;
    sfx('boom');
    const ring = scene.add.circle(this.x, this.y, CFG.popPx, POP_COLOR, 0.45).setDepth(this.depth + 1);
    scene.tweens.add({ targets: ring, alpha: 0, scale: 1.15, duration: 260, onComplete: () => ring.destroy() });
    if (blast && !scene.dead && blastHits(this, scene.player, CFG.popPx)) scene.hurtPlayer();
    this.destroy();
  }
}
