import * as Phaser from 'phaser';
import { introCanSkip, introDone } from '../systems/BossIntro.js';
import { textStyle } from './ui.js';

/**
 * Представлення боса (етап 9, §9.3): затемнення, ім'я великими літерами, «Коло n», спрайт крупно.
 * Гра в цей час на паузі (ставить і знімає GameScene). Дотик пропускає після skipMs, саме закривається через autoCloseMs.
 * Час — власний годинник цієї сцени: Game стоїть. Закриття — подія 'intro:closed' у сцені Game.
 */
export default class BossIntroScene extends Phaser.Scene {
  constructor() {
    super('BossIntro');
  }

  create({ name, subtitle, sprite, frame = 0, scale = 2 }) {
    const { width, height } = this.scale;
    this.closed = false;
    this.openedAt = this.game.loop.time; // той самий годинник, що й update(time)
    this.add.rectangle(0, 0, width, height, 0x000000, 0.78).setOrigin(0).setInteractive();
    const img = this.add.image(width / 2, height * 0.4, sprite, frame).setScale(scale * 0.6).setAlpha(0);
    this.tweens.add({ targets: img, scale, alpha: 1, duration: 350, ease: 'Back.easeOut' });
    const title = this.add.text(width / 2, height * 0.6, name.toUpperCase(), { ...textStyle(68, '#ffd84a'), stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    title.setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.add.text(width / 2, height * 0.66, subtitle, textStyle(40, '#cfe8cf')).setOrigin(0.5);
    this.hint = this.add.text(width / 2, height * 0.9, 'Тапни, щоб почати бій', textStyle(30, '#9aa3a8')).setOrigin(0.5).setAlpha(0);
    this.input.on('pointerdown', () => {
      if (introCanSkip(this.game.loop.time - this.openedAt)) this.close();
    });
  }

  update(time) {
    const t = time - this.openedAt;
    if (introCanSkip(t)) this.hint.setAlpha(0.8);
    if (introDone(t)) this.close();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.scene.stop();
    this.scene.get('Game').events.emit('intro:closed');
  }
}
