import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { animKey } from '../art/sprites/index.js';
import { chargeReadiness, createJump, jumpPosition, releaseJump, reverseJump, slideLift, stepJump } from '../systems/Jump.js';

// шкала кулдауну зарядженого стрибка під слизаком (етап 14) — верстка, не баланс
const METER = { w: 40, h: 6, dy: 34 };

/**
 * Слизак. Стоїть на внутрішньому краї стіни на висоті playerYRatio і стрибає на протилежну стіну.
 * Тап — стрибок; утримання — довший і вищий стрибок; повторний тап у польоті — розворот назад.
 * Рух крокує GameScene.update → step(dt), тож пауза гри зупиняє і стрибок.
 * Етап 14: заряджений стрибок (утримання, коли заряд готовий) сідає на крок вище й сповзає на місце (lift);
 * кулдаун видно шкалою під слизаком. Події: 'jumped', 'reversed', 'landed', 'charged' (заряд знову готовий).
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
    this.lift = 0; // на скільки px слизак зараз над baseY (сповзає після зарядженого стрибка)
    this.chargeReadyAt = 0; // nowMs, коли заряд знову готовий
    this.meter = scene.add.graphics().setDepth(20);
    this.x = this.wallX(this.side);
    this.skin = 'slime'; // текстура/анімації: 'slime' або трансформація ('slimeSpider')
    this.play(animKey(this.skin, 'idle'));
  }

  /** Скін трансформації (той самий розмір полотна — хітбокс не міняється). */
  setSkin(key) {
    this.skin = key;
    this.play(animKey(key, this.isJumping ? 'jump' : 'idle'));
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
    this.y = this.baseY - this.lift;
    this.x = this.wallX(this.side);
  }

  /** Час гри для кулдауну заряду (сцена тримає nowMs; без нього — 0). */
  now() {
    return this.scene.nowMs ?? 0;
  }

  get chargeReady() {
    return this.now() >= this.chargeReadyAt;
  }

  /** Шкала кулдауну під слизаком: видно, лише поки заряд відновлюється. */
  drawMeter() {
    this.meter.clear();
    const k = chargeReadiness(this.chargeReadyAt, this.now());
    if (k >= 1 || !this.visible) return;
    const x = this.x - METER.w / 2;
    const y = this.y + METER.dy;
    this.meter.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, METER.w + 2, METER.h + 2);
    this.meter.fillStyle(0x9cff57, 1).fillRect(x, y, METER.w * k, METER.h);
  }

  destroy(fromScene) {
    this.meter?.destroy();
    super.destroy(fromScene);
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
    this.jumpState = createJump(this.side, { holding, charged: holding && this.chargeReady, startLift: this.lift });
    this.play(animKey(this.skin, 'jump'));
    this.emit('jumped');
  }

  step(dt) {
    const wasReady = this.chargeReady;
    this.stepJumpOrSlide(dt);
    if (!wasReady && this.chargeReady) this.emit('charged');
    this.drawMeter();
  }

  stepJumpOrSlide(dt) {
    if (!this.jumpState) {
      if (this.lift > 0) {
        this.lift = slideLift(this.lift, dt);
        this.y = this.baseY - this.lift;
      }
      return;
    }
    const r = stepJump(this.jumpState, dt, this.speedMul);
    if (r.landedSide) {
      this.jumpState = null;
      this.side = r.landedSide;
      this.x = this.wallX(this.side);
      this.lift = r.lift;
      if (r.charged) this.chargeReadyAt = this.now() + BALANCE.charge.cooldownMs;
      this.y = this.baseY - this.lift;
      this.setFlipX(this.side === 'right');
      this.play(animKey(this.skin, 'idle'));
      this.emit('landed');
      return;
    }
    this.jumpState = r.jump;
    const p = jumpPosition(r.jump, this.wallX(r.jump.from), this.wallX(r.jump.to), this.baseY);
    this.x = p.x;
    this.y = p.y;
  }
}
