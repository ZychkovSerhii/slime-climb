import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

/**
 * Базовий ворог. Після додавання в групу enemies викликай spawned().
 * scrollsWithWorld: true — ворог «прикріплений» до світу і їде вниз разом зі стінами;
 * false — рухається відносно екрана (сам керує швидкістю).
 * Подія сцени 'enemy:killed' { type, x, y } — коли hp ≤ 0.
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, type) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    this.type = type;
    this.hp = type === 'boss' ? BALANCE.boss.hp : BALANCE.enemies[type].hp;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.scrollsWithWorld = true;
  }

  /** Викликається після додавання у фізичну групу (група скидає швидкість тіла). */
  spawned() {}

  speedMul(nowMs) {
    return nowMs < this.slowUntil ? this.slowFactor : 1;
  }

  takeHit(damage, slow, nowMs) {
    if (!this.active || this.hp <= 0) return;
    this.hp -= damage;
    if (slow) {
      this.slowFactor = slow.factor;
      this.slowUntil = nowMs + slow.durationMs;
    }
    if (this.hp <= 0) {
      this.scene.events.emit('enemy:killed', { type: this.type, x: this.x, y: this.y });
      this.destroy();
    }
  }

  /** Швидкість на екрані (px/s): власна + прокрутка світу, якщо ворог їде разом зі світом. */
  screenVelocity(scrollPxPerSec) {
    const v = this.body ? this.body.velocity : { x: 0, y: 0 };
    return { vx: v.x, vy: v.y + (this.scrollsWithWorld ? scrollPxPerSec : 0) };
  }

  isOffscreen() {
    const m = BALANCE.offscreenMarginPx;
    const { width, height } = this.scene.scale;
    return this.x < -m || this.x > width + m || this.y < -m || this.y > height + m;
  }

  isOnScreen() {
    const { width, height } = this.scene.scale;
    return this.x >= 0 && this.x <= width && this.y >= 0 && this.y <= height;
  }
}
