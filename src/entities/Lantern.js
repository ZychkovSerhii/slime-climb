import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { lanternShouldArm } from '../systems/Bamboo.js';
import { squareBlastHits } from '../systems/Bamboo.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.lantern;
const BLAST_COLOR = 0xffb347;

/**
 * Ліхтарик-дух (бамбук, §9.1): з'являється згори і повільно пливе до гравця (відносно екрана).
 * Ближче за armPx (3 слимаки) — зупиняється, стає невразливим, blinkMs блимає і вибухає квадратом зі стороною 2×radius
 * (площа 10 слимаків; гравець у квадраті — мінус життя). Убити можна лише до того, як він зупинився. Вибух нагороди не дає.
 */
export default class Lantern extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('lantern');
    const minX = BALANCE.wallWidth + tex.width / 2;
    super(scene, Phaser.Math.FloatBetween(minX, width - minX), -tex.height / 2, 'lantern', 'lantern');
    this.scrollsWithWorld = false;
    this.armedAt = null;
    // посилений (коло 1+, етап 10): вибух ×radiusMul ширший
    this.radius = CFG.radiusPx * (this.trait?.radiusMul ?? 1); // читає й бот-плейтест
    this.play({ key: animKey('lantern', 'glow'), startFrame: Phaser.Math.Between(0, 1) });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const p = scene.player;
    const now = scene.nowMs;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    scene.physics.velocityFromRotation(angle, CFG.speed * this.speedMul(now), this.body.velocity);
    if (this.armedAt === null) {
      if (lanternShouldArm(Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y))) {
        this.armedAt = now;
        this.body.setVelocity(0, 0); // фідбек-7: зупиняється й невразливий, поки блимає
        this.invulnerable = true;
        this.play(animKey('lantern', 'blink'));
        sfx('fuse');
      }
      return;
    }
    if (now >= this.armedAt + CFG.blinkMs) this.explode();
  }

  explode() {
    const scene = this.scene;
    sfx('boom');
    const ring = scene.add.rectangle(this.x, this.y, this.radius * 2, this.radius * 2, BLAST_COLOR, 0.45).setDepth(this.depth + 1);
    scene.tweens.add({ targets: ring, alpha: 0, scale: 1.15, duration: 280, onComplete: () => ring.destroy() });
    if (!scene.dead && squareBlastHits(this, scene.player, this.radius)) scene.hurtPlayer();
    this.destroy();
  }
}
