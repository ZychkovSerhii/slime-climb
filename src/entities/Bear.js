import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { sfx } from '../systems/Audio.js';
import { roarReaches } from '../systems/Biome.js';
import WallWalker from './WallWalker.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.bear;
const RING_COLOR = 0xcfe8ff;

/**
 * Білий ведмідь (зима, фідбек-3): рухома перешкода на стіні, де гравця немає. Лізе вгору по стіні
 * на climbSpeed відносно світу (на екрані повільно сповзає вниз), дотик шкодить.
 * Коли він на екрані щонайменше rearFirstMs і гравець ближче за 1,4 радіуса ричання — стає на задні лапи
 * (стоїть разом зі світом): warnMs попередження (поза «rear» і коло), потім ричить. Хто в колі — приголомшений
 * (Status.roar). Наступне ричання — не раніше ніж через rearEveryMs. З протилежної стіни ведмідь не дістає.
 */
export default class Bear extends WallWalker {
  constructor(scene, side, y) {
    super(scene, side, y, 'bear', 'bear', 'up');
    this.seenAt = null;
    this.nextRearAt = 0;
    this.rearUntil = null;
    this.ring = null;
    this.play(animKey('bear', 'walk'));
  }

  worldSpeed(now) {
    return this.rearUntil !== null ? 0 : CFG.climbSpeed * this.speedMul(now);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const now = scene.nowMs;
    if (this.rearUntil !== null) {
      this.ring?.setPosition(this.x, this.y);
      if (now >= this.rearUntil) this.roar();
      return;
    }
    if (!this.isOnScreen()) return;
    if (this.seenAt === null) this.seenAt = now;
    const near = Phaser.Math.Distance.Between(this.x, this.y, scene.player.x, scene.player.y) < CFG.roarRadiusPx * 1.4;
    if (near && now >= this.seenAt + CFG.rearFirstMs && now >= this.nextRearAt) this.rear(now);
  }

  /** На задні лапи: попередження перед ричанням. */
  rear(now) {
    this.rearUntil = now + CFG.warnMs;
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
    this.play(animKey('bear', 'walk'));
  }

  destroy(fromScene) {
    this.ring?.destroy();
    this.ring = null;
    super.destroy(fromScene);
  }
}
