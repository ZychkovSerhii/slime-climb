import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { animKey } from '../art/sprites/index.js';
import { createJump, jumpPosition, releaseJump, reverseJump, stepJump } from '../systems/Jump.js';

/**
 * Слизак. Стоїть на внутрішньому краї стіни на висоті playerYRatio і стрибає на протилежну стіну.
 * Тап — стрибок; утримання — довший і вищий стрибок; повторний тап у польоті — розворот назад.
 * Рух крокує GameScene.update → step(dt), тож пауза гри зупиняє і стрибок.
 * Події: 'jumped', 'reversed', 'landed'.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene) {
    const { height } = scene.scale;
    super(scene, 0, height * BALANCE.playerYRatio, 'slime');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);

    this.side = 'left';
    this.jumpState = null;
    this.speedMul = 1; // > 1 — стрибки швидші (картки, ефекти)
    this.baseY = this.y;
    this.x = this.wallX(this.side);
    this.play(animKey('slime', 'idle'));
  }

  get isJumping() {
    return this.jumpState !== null;
  }

  /** x центру слизака, коли він сидить на стіні side. */
  wallX(side) {
    const half = BALANCE.playerSize / 2;
    return side === 'left' ? BALANCE.wallWidth + half : this.scene.scale.width - BALANCE.wallWidth - half;
  }

  /** Після зміни розміру екрана: нова висота і край стіни (під час стрибка позиція рахується щокроку). */
  relayout() {
    this.baseY = this.scene.scale.height * BALANCE.playerYRatio;
    if (this.isJumping) return;
    this.y = this.baseY;
    this.x = this.wallX(this.side);
  }

  /** Дотик: на стіні — стрибок з утриманням; у польоті — розворот (один раз за стрибок). */
  press() {
    if (!this.jumpState) {
      this.startJump(true);
      return;
    }
    const r = reverseJump(this.jumpState);
    if (r) {
      this.jumpState = r;
      this.emit('reversed');
    }
  }

  /** Палець відпустили — стрибок перестає рости. */
  release() {
    if (this.jumpState) this.jumpState = releaseJump(this.jumpState);
  }

  /** Звичайний (короткий) стрибок — для бота-плейтестера й коду, що не знає про утримання. */
  jump() {
    if (!this.jumpState) this.startJump(false);
  }

  startJump(holding) {
    this.jumpState = createJump(this.side, { holding });
    this.play(animKey('slime', 'jump'));
    this.emit('jumped');
  }

  step(dt) {
    if (!this.jumpState) return;
    const r = stepJump(this.jumpState, dt, this.speedMul);
    if (r.landedSide) {
      this.jumpState = null;
      this.side = r.landedSide;
      this.x = this.wallX(this.side);
      this.y = this.baseY;
      this.setFlipX(this.side === 'right');
      this.play(animKey('slime', 'idle'));
      this.emit('landed');
      return;
    }
    this.jumpState = r.jump;
    const p = jumpPosition(r.jump, this.wallX(r.jump.from), this.wallX(r.jump.to), this.baseY);
    this.x = p.x;
    this.y = p.y;
  }
}
