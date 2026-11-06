import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

/**
 * Слизак. Стоїть на внутрішньому краї стіни на висоті playerYRatio і стрибає на протилежну стіну.
 * Події: 'landed' — після приземлення.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene) {
    const { height } = scene.scale;
    super(scene, 0, height * BALANCE.playerYRatio, 'slime');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);

    this.side = 'left';
    this.isJumping = false;
    this.baseY = this.y;
    this.x = this.wallX(this.side);
  }

  /** x центру слизака, коли він сидить на стіні side. */
  wallX(side) {
    const half = BALANCE.playerSize / 2;
    return side === 'left' ? BALANCE.wallWidth + half : this.scene.scale.width - BALANCE.wallWidth - half;
  }

  /** Після зміни розміру екрана: нова висота і край стіни (під час стрибка — після приземлення). */
  relayout() {
    this.baseY = this.scene.scale.height * BALANCE.playerYRatio;
    if (this.isJumping) return;
    this.y = this.baseY;
    this.x = this.wallX(this.side);
  }

  jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    const target = this.side === 'left' ? 'right' : 'left';
    const duration = BALANCE.jumpDurationMs;

    this.scene.tweens.add({
      targets: this,
      x: this.wallX(target),
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.side = target;
        this.isJumping = false;
        this.x = this.wallX(target);
        this.y = this.baseY;
        this.emit('landed');
      },
    });
    // дуга: вгору на jumpArcPx за половину стрибка і назад
    this.scene.tweens.add({
      targets: this,
      y: this.baseY - BALANCE.jumpArcPx,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
    });
  }
}
