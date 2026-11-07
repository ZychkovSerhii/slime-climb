import * as Phaser from 'phaser';
import { browserStorage, saveHighScore } from '../systems/HighScore.js';
import { formatTime } from '../systems/Format.js';

// Захист від випадкового тапу: гравець міг тапати для стрибка в момент смерті
const INPUT_DELAY_MS = 600;

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ score = 0, timeSec = 0 } = {}) {
    const { width, height } = this.scale;
    const best = saveHighScore(browserStorage(), score);
    const isRecord = score > 0 && score >= best;
    const cx = width / 2;
    const style = (size, color = '#ffffff') => ({ fontFamily: 'sans-serif', fontSize: `${size}px`, color, align: 'center' });

    this.add.text(cx, height * 0.3, 'GAME OVER', style(80, '#ff5c5c')).setOrigin(0.5);
    this.add.text(cx, height * 0.42, `SCORE ${score}`, style(56)).setOrigin(0.5);
    this.add.text(cx, height * 0.48, `час ${formatTime(timeSec)}`, style(36, '#cccccc')).setOrigin(0.5);
    this.add
      .text(cx, height * 0.56, isRecord ? 'Новий рекорд!' : `Рекорд ${best}`, style(44, isRecord ? '#ffd84a' : '#ffffff'))
      .setOrigin(0.5);
    const hint = this.add.text(cx, height * 0.72, 'Тапни, щоб грати ще', style(40)).setOrigin(0.5).setAlpha(0);

    this.time.delayedCall(INPUT_DELAY_MS, () => {
      hint.setAlpha(1);
      this.input.once('pointerdown', () => this.scene.start('Game'));
    });
  }
}
