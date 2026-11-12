import * as Phaser from 'phaser';
import { browserStorage, loadHighScore } from '../systems/HighScore.js';
import { loadMeta, skinSprite, unclaimedCount } from '../systems/Meta.js';
import { isMuted, setMuted, sfx } from '../systems/Audio.js';
import { button, textStyle } from './ui.js';
import { loadSettings, saveSettings } from '../systems/Settings.js';
import { codex, codexOpen } from '../codex/index.js';
import { isDefault, loadTuning, presetName } from '../systems/Tuning.js';

/** Стартовий екран: назва, рекорд, Шаги, «Тапни, щоб почати», магазин, досягнення, довідник, звук, сніг, туман. */
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

    const shopBtn = button(this, cx, height * 0.67, 'Магазин', () => this.scene.start('Shop'));
    const waiting = unclaimedCount(meta);
    const achBtn = button(this, cx, height * 0.73, waiting > 0 ? `Досягнення (${waiting}!)` : 'Досягнення', () => this.scene.start('Achievements'), waiting > 0 ? '#ffd84a' : undefined);

    // довідник (етап 7) — HTML-шар поверх гри; поки він відкритий, тап по меню не стартує гру
    const codexBtn = button(this, cx, height * 0.79, 'Довідник', () => codex().open());

    const soundLabel = () => `Звук: ${isMuted() ? 'вимк.' : 'увімк.'}`;
    const soundBtn = button(this, cx - width * 0.22, height * 0.85, soundLabel(), () => {
      setMuted(!isMuted());
      soundBtn.setText(soundLabel());
      sfx('jump');
    }, undefined, 30);
    // режим налаштувань складності (після етапу 10): підбір балансу без перезбирання
    const tuningName = presetName(loadTuning(storage));
    const tuningBtn = button(this, cx + width * 0.22, height * 0.85, `Складність: ${tuningName}`, () => this.scene.start('Tuning'), isDefault(loadTuning(storage)) ? undefined : '#ffd84a', 30);

    // сніг у зимовому біомі (етап 6a): хтось його не любить або в нього слабкий телефон
    const settings = loadSettings(storage);
    // туман бамбука (етап 9) — поруч зі снігом, в одному рядку
    const toggle = (x, key, name) => {
      const label = () => `${name}: ${settings[key] ? 'увімк.' : 'вимк.'}`;
      const b = button(this, x, height * 0.91, label(), () => {
        settings[key] = !settings[key];
        saveSettings(storage, settings);
        b.setText(label());
        sfx('jump');
      }, undefined, 30);
      return b;
    };
    const snowBtn = toggle(cx - width * 0.22, 'snow', 'Сніг');
    const fogBtn = toggle(cx + width * 0.22, 'fog', 'Туман');

    if (new URLSearchParams(window.location.search).get('codex') === '1' && !this.registry.get('codexShown')) {
      this.registry.set('codexShown', true);
      codex().open();
    }

    // тап будь-де, крім кнопок, — старт гри
    const buttons = [shopBtn, achBtn, codexBtn, soundBtn, tuningBtn, snowBtn, fogBtn];
    let started = false;
    this.input.on('pointerdown', (pointer, over) => {
      if (started || codexOpen() || over.some((o) => buttons.includes(o))) return;
      started = true;
      this.scene.start('Game');
    });
  }
}
