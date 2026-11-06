import * as Phaser from 'phaser';
import { browserStorage, loadHighScore } from '../systems/HighScore.js';

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

    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
