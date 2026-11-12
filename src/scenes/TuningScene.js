import * as Phaser from 'phaser';
import { browserStorage } from '../systems/HighScore.js';
import { sfx } from '../systems/Audio.js';
import { HEAL_LABELS, PRESETS, TUNING_FIELDS, loadTuning, presetName, saveTuning, stepField } from '../systems/Tuning.js';
import { backButton, button, rebuildOnResize, textStyle } from './ui.js';

/** Режим налаштувань складності: готові набори і множники по полях. Діє з наступного забігу. */
export default class TuningScene extends Phaser.Scene {
  constructor() {
    super('Tuning');
  }

  create() {
    rebuildOnResize(this, Phaser);
    this.storage = browserStorage();
    this.t = loadTuning(this.storage);
    this.draw();
  }

  /** Перемалювати весь екран після зміни. */
  draw() {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add.text(cx, height * 0.05, 'Складність', textStyle(60, '#9cff57')).setOrigin(0.5);
    this.add.text(cx, height * 0.1, `Набір: ${presetName(this.t)}`, textStyle(34, '#ffd84a')).setOrigin(0.5);

    const presets = Object.values(PRESETS);
    presets.forEach((p, i) => {
      const x = cx + (i - (presets.length - 1) / 2) * (width * 0.3);
      const on = presetName(this.t) === p.name;
      button(this, x, height * 0.155, p.name, () => this.set({ ...p.values }), on ? '#9cff57' : '#cfe8cf', 32);
    });

    const top = height * 0.23;
    const rowH = height * 0.068;
    TUNING_FIELDS.forEach((f, i) => {
      const y = top + i * rowH;
      const v = this.t[f.key];
      const changed = f.options ? v !== 'game' : v !== 1;
      this.add.rectangle(cx, y, width - 40, rowH - 8, 0x000000, 0.35);
      this.add.text(36, y, f.label, { ...textStyle(30, changed ? '#ffd84a' : '#ffffff'), align: 'left' }).setOrigin(0, 0.5);
      const valueText = f.options ? HEAL_LABELS[v] : `×${v.toFixed(1)}`;
      const vx = width - (f.options ? 200 : 160);
      this.add.text(vx, y, valueText, textStyle(f.options ? 26 : 30, changed ? '#ffd84a' : '#ffffff')).setOrigin(0.5);
      button(this, width - (f.options ? 360 : 270), y, '−', () => this.set(stepField(this.t, f.key, -1)), '#cfe8cf', 34);
      button(this, width - 56, y, '+', () => this.set(stepField(this.t, f.key, 1)), '#cfe8cf', 34);
    });

    this.add
      .text(cx, height * 0.85, 'Діє з наступного забігу.\nНабір видно в грі під рахунком.', textStyle(26, '#cccccc'))
      .setOrigin(0.5);
    backButton(this);
  }

  set(t) {
    this.t = t;
    saveTuning(this.storage, t);
    sfx('jump');
    this.draw();
  }
}
