import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { formatTime } from '../systems/Format.js';

// Розкладка HUD (px базової роздільності) — це верстка, не баланс
const PAD = 24;
const HEART_STEP = 40;
const XP_BAR = { y: 76, w: 220, h: 14 };
const TEXT_STYLE = { fontFamily: 'monospace', fontSize: '36px', color: '#ffffff' };
const SMALL_STYLE = { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff' };

/** Таймер і score справа вгорі, серця і шкала досвіду зліва. Слухає подію 'hud:update' сцени Game. */
export default class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    const { width } = this.scale;
    this.timeText = this.add.text(width - PAD, PAD, '00:00', TEXT_STYLE).setOrigin(1, 0);
    this.scoreText = this.add.text(width - PAD, PAD + 44, 'SCORE 0', TEXT_STYLE).setOrigin(1, 0);

    this.hearts = [];
    for (let i = 0; i < BALANCE.maxLives; i++) {
      this.hearts.push(this.add.image(PAD + 16 + i * HEART_STEP, PAD + 14, 'heart'));
    }
    this.xpBar = this.add.graphics();
    this.levelText = this.add.text(PAD + XP_BAR.w + 12, XP_BAR.y - 6, 'LV 1', SMALL_STYLE);

    this.update_({ timeSec: 0, score: 0, lives: BALANCE.maxLives, level: 1, xp: 0, xpToNext: BALANCE.xpBase });

    const game = this.scene.get('Game');
    const onUpdate = (s) => this.update_(s);
    game.events.on('hud:update', onUpdate);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => game.events.off('hud:update', onUpdate));
  }

  update_({ timeSec, score, lives, level, xp, xpToNext }) {
    this.timeText.setText(formatTime(timeSec));
    this.scoreText.setText(`SCORE ${score}`);
    this.hearts.forEach((h, i) => h.setAlpha(i < lives ? 1 : 0.2));
    this.levelText.setText(`LV ${level}`);

    const k = xpToNext > 0 ? Math.min(xp / xpToNext, 1) : 0;
    this.xpBar.clear();
    this.xpBar.fillStyle(0x000000, 0.5).fillRect(PAD, XP_BAR.y, XP_BAR.w, XP_BAR.h);
    this.xpBar.fillStyle(0x7ad3ff, 1).fillRect(PAD, XP_BAR.y, XP_BAR.w * k, XP_BAR.h);
  }
}
