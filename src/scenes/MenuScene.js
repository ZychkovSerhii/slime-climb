import * as Phaser from 'phaser';
import { browserStorage, loadHighScore } from '../systems/HighScore.js';
import { isMuted, setMuted, sfx } from '../systems/Audio.js';

/** Стартовий екран: назва, рекорд, «Тапни, щоб почати». */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // зміна розміру екрана → перебудувати екран
    const onResize = () => this.scene.restart(undefined);
    this.scale.once(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    const { width, height } = this.scale;
    const cx = width / 2;
    const style = (size, color = '#ffffff') => ({ fontFamily: 'sans-serif', fontSize: `${size}px`, color, align: 'center' });
    const best = loadHighScore(browserStorage());

    this.add.image(cx, height * 0.3, 'slime').setScale(3);
    this.add.text(cx, height * 0.42, 'Slime Climb', style(88, '#9cff57')).setOrigin(0.5);
    this.add.text(cx, height * 0.52, best > 0 ? `Рекорд ${best}` : 'Рекорду ще немає', style(44)).setOrigin(0.5);
    const hint = this.add.text(cx, height * 0.7, 'Тапни, щоб почати', style(44)).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    const soundLabel = () => `Звук: ${isMuted() ? 'вимк.' : 'увімк.'}`;
    const soundBtn = this.add
      .text(cx, height * 0.86, soundLabel(), { ...style(36, '#cfe8cf'), backgroundColor: '#00000066', padding: { x: 24, y: 12 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    soundBtn.on('pointerdown', () => {
      setMuted(!isMuted());
      soundBtn.setText(soundLabel());
      sfx('jump');
    });

    // тап будь-де, крім кнопки звуку, — старт гри
    let started = false;
    this.input.on('pointerdown', (pointer, over) => {
      if (started || over.includes(soundBtn)) return;
      started = true;
      this.scene.start('Game');
    });
  }
}
