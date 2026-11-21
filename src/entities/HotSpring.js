import * as Phaser from 'phaser';
import { animKey, frameOf } from '../art/sprites/index.js';

// Тіло — лише чаша, що виступає зі стіни (у текстурі для правої стіни: x 0…56, y 64…108).
const BODY = { w: 56, h: 44, y: 64 };
const SCALE = 1.5; // чаша виступає в прохід на ~42 px (менше за слизака)
const GLOW = 0x35d3df;

/**
 * Гаряче джерело (фідбек-9): святилище, вбудоване в стіну side, їде разом зі світом (група pickups, kind 'spring').
 * Дотик чаші — життя до максимуму (SpawnDirector.useSpring), один раз: потім вода зникає (кадр dry).
 */
export default class HotSpring extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, side, y) {
    const tex = scene.textures.getFrame('hotSpring');
    const half = (tex.width * SCALE) / 2;
    const x = side === 'left' ? half : scene.scale.width - half;
    super(scene, x, y, 'hotSpring', frameOf('hotSpring', 'flow1'));
    scene.add.existing(this);
    this.kind = 'spring';
    this.side = side;
    this.used = false;
    this.scrollsWithWorld = true;
    this.setScale(SCALE).setFlipX(side === 'left').setDepth(-0.5); // над стіною (-1), під слизаком і ворогами
    this.play(animKey('hotSpring', 'flow'));
    // бірюзове сяйво довкола водоспаду
    this.glow = scene.add.circle(x, y, 70, GLOW, 0.22).setDepth(-0.6).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: this.glow, alpha: 0.1, scale: 1.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Тіло з'являється, коли спрайт додано до групи (pickups): ставимо його на чашу. */
  fitBody() {
    const ox = this.side === 'left' ? this.width - BODY.w : 0;
    this.body.setSize(BODY.w, BODY.h, false).setOffset(ox, BODY.y);
    this.body.setAllowGravity(false);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.glow) this.glow.setPosition(this.x + (this.side === 'left' ? 12 : -12), this.y + 10);
  }

  destroy(fromScene) {
    this.glow?.destroy();
    this.glow = null;
    super.destroy(fromScene);
  }

  dry() {
    this.glow?.destroy();
    this.glow = null;
    this.used = true;
    this.stop();
    this.setFrame(frameOf('hotSpring', 'dry'));
  }
}
