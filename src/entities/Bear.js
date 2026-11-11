import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { sfx } from '../systems/Audio.js';
import { roarReaches } from '../systems/Biome.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.bear;
const RING_COLOR = 0xcfe8ff;

/**
 * Білий ведмідь (зима): живучий, таранить по прямій у точку, де був гравець.
 * Коли він на екрані щонайменше rearFirstMs і гравець ближче за 1,4 радіуса ричання — стає на задні лапи:
 * warnMs попередження (поза «rear» і коло радіуса ричання), потім ричить. Хто в колі — приголомшений
 * (Status.roar: стрибок і стрільба повільніші, множники в BALANCE.enemies.bear.roar). Наступне ричання — не раніше ніж через rearEveryMs.
 * Від ричання рятує стрибок на іншу стіну: коридор ширший за радіус.
 */
export default class Bear extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('bear');
    const minX = BALANCE.wallWidth + tex.width / 2;
    super(scene, Phaser.Math.FloatBetween(minX, width - minX), -tex.height / 2, 'bear', 'bear');
    this.scrollsWithWorld = false;
    this.dir = new Phaser.Math.Vector2(0, 1);
    this.seenAt = null;
    this.nextRearAt = 0;
    this.rearUntil = null;
    this.ring = null;
    this.aim();
    this.play(animKey('bear', 'walk'));
  }

  aim() {
    const p = this.scene.player;
    this.dir.set(p.x - this.x, p.y - this.y).normalize();
    this.setFlipX(this.dir.x < 0);
  }

  onWrapped() {
    this.aim();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const now = scene.nowMs;
    if (this.rearUntil !== null) {
      this.body.setVelocity(0, 0);
      this.ring?.setPosition(this.x, this.y);
      if (now >= this.rearUntil) this.roar();
      return;
    }
    const speed = CFG.speed * this.speedMul(now);
    this.body.setVelocity(this.dir.x * speed, this.dir.y * speed);
    if (!this.wrapEdges('y')) return;
    if (!this.isOnScreen()) return;
    if (this.seenAt === null) this.seenAt = now;
    const near = Phaser.Math.Distance.Between(this.x, this.y, scene.player.x, scene.player.y) < CFG.roarRadiusPx * 1.4;
    if (near && now >= this.seenAt + CFG.rearFirstMs && now >= this.nextRearAt) this.rear(now);
  }

  /** На задні лапи: попередження перед ричанням. */
  rear(now) {
    this.rearUntil = now + CFG.warnMs;
    this.body.setVelocity(0, 0);
    this.play(animKey('bear', 'rear'));
    this.ring = this.scene.add.circle(this.x, this.y, CFG.roarRadiusPx, RING_COLOR, 0.08).setStrokeStyle(4, RING_COLOR, 0.5);
    this.ring.setScale(0.2);
    this.scene.tweens.add({ targets: this.ring, scale: 1, duration: CFG.warnMs, ease: 'Sine.easeOut' });
  }

  roar() {
    const scene = this.scene;
    this.rearUntil = null;
    this.nextRearAt = scene.nowMs + CFG.rearEveryMs;
    sfx('roar');
    if (roarReaches(this, scene.player)) scene.roarPlayer();
    const ring = this.ring;
    this.ring = null;
    if (ring) scene.tweens.add({ targets: ring, alpha: 0, scale: 1.15, duration: 250, onComplete: () => ring.destroy() });
    this.aim(); // після ричання — знову на гравця
    this.play(animKey('bear', 'walk'));
  }

  destroy(fromScene) {
    this.ring?.destroy();
    this.ring = null;
    super.destroy(fromScene);
  }
}
