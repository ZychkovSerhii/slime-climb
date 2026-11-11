import * as Phaser from 'phaser';
import { browserStorage, loadHighScore } from '../systems/HighScore.js';
import { loadMeta, skinSprite, unclaimedCount } from '../systems/Meta.js';
import { isMuted, setMuted, sfx } from '../systems/Audio.js';
import { button, textStyle } from './ui.js';
import { loadSettings, saveSettings } from '../systems/Settings.js';

/** Стартовий екран: назва, рекорд, Шаги, «Тапни, щоб почати», магазин, досягнення, звук. */
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
    const storage = browserStorage();
    const best = loadHighScore(storage);
    const meta = loadMeta(storage);

    this.add.image(cx, height * 0.24, skinSprite(meta)).setScale(3);
    this.add.text(cx, height * 0.36, 'Slime Climb', textStyle(88, '#9cff57')).setOrigin(0.5);
    this.add.text(cx, height * 0.45, best > 0 ? `Рекорд ${best}` : 'Рекорду ще немає', textStyle(44)).setOrigin(0.5);
    this.add.text(cx, height * 0.51, `Шаги: ${meta.steps}`, textStyle(40, '#ffd84a')).setOrigin(0.5);
    const hint = this.add.text(cx, height * 0.61, 'Тапни, щоб почати', textStyle(44)).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    const shopBtn = button(this, cx, height * 0.69, 'Магазин', () => this.scene.start('Shop'));
    const waiting = unclaimedCount(meta);
    const achBtn = button(this, cx, height * 0.76, waiting > 0 ? `Досягнення (${waiting}!)` : 'Досягнення', () => this.scene.start('Achievements'), waiting > 0 ? '#ffd84a' : undefined);

    const soundLabel = () => `Звук: ${isMuted() ? 'вимк.' : 'увімк.'}`;
    const soundBtn = button(this, cx, height * 0.83, soundLabel(), () => {
      setMuted(!isMuted());
      soundBtn.setText(soundLabel());
      sfx('jump');
    });

    // сніг у зимовому біомі (етап 6a): хтось його не любить або в нього слабкий телефон
    const settings = loadSettings(storage);
    const snowLabel = () => `Сніг: ${settings.snow ? 'увімк.' : 'вимк.'}`;
    const snowBtn = button(this, cx, height * 0.9, snowLabel(), () => {
      settings.snow = !settings.snow;
      saveSettings(storage, settings);
      snowBtn.setText(snowLabel());
      sfx('jump');
    });

    // тап будь-де, крім кнопок, — старт гри
    const buttons = [shopBtn, achBtn, soundBtn, snowBtn];
    let started = false;
    this.input.on('pointerdown', (pointer, over) => {
      if (started || over.some((o) => buttons.includes(o))) return;
      started = true;
      this.scene.start('Game');
    });
  }
}
