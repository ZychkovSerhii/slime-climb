import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { puffBlastDamage, puffShouldFuse } from '../systems/Grass.js';
import { sfx } from '../systems/Audio.js';
import { animKey, frameOf } from '../art/sprites/index.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.puffball;
const BLAST = 0xd8c890;

/**
 * Пшикач (біом 5, вибуховик): з'являється згори на стіні side (стіна гравця) і біжить по ній униз (відносно екрана).
 * Ближче fusePx до гравця — «пш-ш» fuseMs: блимає, роздувається й далі повзе до гравця на creepSpeed; потім вибух
 * radiusPx. Впритул (contactPx) — мінус contactDamage життів (ТЗ: 3), у радіусі — мінус 1. Рятує стрибок на іншу стіну.
 * Сам дотик не шкодить (лише вибух). Убитий до вибуху — вибуху немає. Нагорода — лише за вбитого.
 */
export default class Puffball extends Enemy {
  constructor(scene, side) {
    const tex = scene.textures.getFrame('puffball');
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : scene.scale.width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, -tex.height / 2, 'puffball', 'puffball');
    this.side = side;
    this.puffball = true;
    this.harmless = true;
    this.scrollsWithWorld = false;
    this.fuseAt = null;
    this.setFrame(frameOf('puffball', 'idle'));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    const p = scene.player;
    const mul = this.speedMul(now);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
    if (this.fuseAt === null) {
      this.body.setVelocity(0, CFG.speed * mul);
      if (puffShouldFuse(dist)) this.light(now);
      else if (this.y > scene.scale.height + BALANCE.offscreenMarginPx) this.destroy();
      return;
    }
    const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    scene.physics.velocityFromRotation(a, CFG.creepSpeed * mul, this.body.velocity);
    if (now >= this.fuseAt + CFG.fuseMs) this.explode();
  }

  light(now) {
    this.fuseAt = now;
    this.play(animKey('puffball', 'hiss'));
    sfx('hiss'); // ТЗ: «пш-ш» підпаленого пороху
    this.swellTween = this.scene.tweens.add({ targets: this, scale: 1.35, duration: CFG.fuseMs, ease: 'Quad.easeIn' });
  }

  explode() {
    const scene = this.scene;
    const p = scene.player;
    sfx('boom');
    const ring = scene.add.circle(this.x, this.y, CFG.radiusPx, BLAST, 0.5).setDepth(this.depth + 1);
    scene.tweens.add({ targets: ring, alpha: 0, scale: 1.2, duration: 320, onComplete: () => ring.destroy() });
    const dmg = puffBlastDamage(Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y));
    if (!scene.dead && dmg > 0) scene.hurtPlayer(dmg);
    this.destroy();
  }

  destroy(fromScene) {
    this.swellTween?.stop();
    super.destroy(fromScene);
  }
}
