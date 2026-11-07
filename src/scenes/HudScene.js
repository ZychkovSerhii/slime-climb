import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { formatTime } from '../systems/Format.js';
import { invisButton, parseCssPx, safeTopGamePx } from '../systems/Layout.js';

// Розкладка HUD (px базової роздільності) — це верстка, не баланс
const PAD = 24;
const HEART_STEP = 40;
const XP_BAR = { y: 76, w: 220, h: 14 };
const BOSS_BAR = { y: 128, h: 18 };
const TEXT_STYLE = { fontFamily: 'monospace', fontSize: '36px', color: '#ffffff' };
const SMALL_STYLE = { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff' };
const BANNER_STYLE = {
  fontFamily: 'sans-serif',
  fontSize: '52px',
  fontStyle: 'bold',
  color: '#ffffff',
  backgroundColor: '#5a0d1acc',
  padding: { x: 36, y: 22 },
  align: 'center',
};
const BOSS_COLOR = 0xff3b5c;
const BOSS_IMMUNE_COLOR = 0x8a8a8a; // невразлива — смуга сіра
const BANNER_FADE_MS = 250;

/**
 * Відступ вирізу камери зверху в CSS px. Capacitor 8 на Android передає його змінною
 * --safe-area-inset-top; у браузерах — через env(safe-area-inset-top).
 */
function readSafeTopCss() {
  try {
    const fromVar = parseCssPx(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'));
    if (fromVar > 0) return fromVar;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top)';
    document.body.appendChild(probe);
    const fromEnv = parseCssPx(getComputedStyle(probe).paddingTop);
    probe.remove();
    return fromEnv;
  } catch {
    return 0;
  }
}

/** Таймер і score справа вгорі, серця і шкала досвіду зліва. Слухає подію 'hud:update' сцени Game. */
export default class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    const { width, height } = this.scale;
    const cssHeight = this.game.canvas.getBoundingClientRect().height;
    // усе в HUD зсувається нижче вирізу камери
    const top = PAD + safeTopGamePx(readSafeTopCss(), cssHeight, height);
    this.top = top;
    this.timeText = this.add.text(width - PAD, top, '00:00', TEXT_STYLE).setOrigin(1, 0);
    this.scoreText = this.add.text(width - PAD, top + 44, 'SCORE 0', TEXT_STYLE).setOrigin(1, 0);

    // серця до максимуму картки «Додаткове життя»; зайві сховані. Останнє місце — чорне серце броні
    this.hearts = [];
    for (let i = 0; i < BALANCE.skills.extraLife.maxLives; i++) {
      this.hearts.push(this.add.image(PAD + 16 + i * HEART_STEP, top + 14, 'heart'));
    }
    this.armorHeart = this.add.image(0, top + 14, 'heart').setTint(0x222230).setVisible(false);
    this.createInvisButton();
    this.xpBar = this.add.graphics();
    this.levelText = this.add.text(PAD + XP_BAR.w + 12, this.xpBarY() - 6, 'LV 1', SMALL_STYLE);

    this.update_({ timeSec: 0, score: 0, lives: BALANCE.maxLives, maxLives: BALANCE.maxLives, level: 1, xp: 0, xpToNext: BALANCE.xpBase });

    this.bossBar = this.add.graphics();
    this.bossLabel = this.add.text(width / 2, this.bossBarY() - 4, '', SMALL_STYLE).setOrigin(0.5, 1).setVisible(false);
    this.banner = this.add.text(width / 2, height * 0.38, '', BANNER_STYLE).setOrigin(0.5).setAlpha(0).setDepth(10);

    const onResize = () => {
      const w = this.scale.width;
      this.timeText.setX(w - PAD);
      this.scoreText.setX(w - PAD);
      this.bossLabel.setX(w / 2);
      this.banner.setPosition(w / 2, this.scale.height * 0.38);
      this.updateBoss(this.lastBoss);
      this.drawInvis(this.lastInvis);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    const game = this.scene.get('Game');
    const onUpdate = (s) => this.update_(s);
    const onBoss = (b) => this.updateBoss(b);
    const onBanner = (b) => this.showBanner(b);
    game.events.on('hud:update', onUpdate);
    game.events.on('hud:boss', onBoss);
    game.events.on('hud:banner', onBanner);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      game.events.off('hud:update', onUpdate);
      game.events.off('hud:boss', onBoss);
      game.events.off('hud:banner', onBanner);
    });
  }

  xpBarY() {
    return this.top - PAD + XP_BAR.y;
  }

  bossBarY() {
    return this.top - PAD + BOSS_BAR.y;
  }

  /** Плашка посеред екрана на ms мс (поява боса). Тапи не ловить. */
  showBanner({ text, ms }) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: BANNER_FADE_MS, ease: 'Back.Out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: ms - BANNER_FADE_MS, duration: BANNER_FADE_MS });
  }

  /** Смуга HP боса; null — сховати. */
  updateBoss(b) {
    this.lastBoss = b;
    this.bossBar.clear();
    this.bossLabel.setVisible(!!b);
    if (!b) return;
    this.bossLabel.setText(b.name ? b.name.toUpperCase() : 'БОС');
    const w = this.scale.width - 2 * PAD - 2 * BALANCE.wallWidth;
    const x = PAD + BALANCE.wallWidth;
    const k = Math.max(b.hp, 0) / b.maxHp;
    this.bossBar.fillStyle(0x000000, 0.6).fillRect(x, this.bossBarY(), w, BOSS_BAR.h);
    this.bossBar.fillStyle(b.invulnerable ? BOSS_IMMUNE_COLOR : BOSS_COLOR, 1).fillRect(x, this.bossBarY(), w * k, BOSS_BAR.h);
  }

  /** Кнопка «Невидимість»: з'являється, коли скіл узято; кільце показує перезарядку. */
  createInvisButton() {
    this.invisGfx = this.add.graphics().setDepth(5);
    this.invisLabel = this.add
      .text(0, 0, 'НЕВИД.', { fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
    this.invisZone = this.add.zone(0, 0, 1, 1).setInteractive().setDepth(6);
    this.invisZone.input.enabled = false;
    this.invisZone.on('pointerdown', () => this.scene.get('Game').events.emit('skill:invis'));
  }

  drawInvis(inv) {
    this.lastInvis = inv;
    this.invisGfx.clear();
    const on = !!inv;
    this.invisLabel.setVisible(on);
    this.invisZone.input.enabled = on;
    if (!on) return;
    const b = invisButton(this.scale.width, this.scale.height);
    this.invisZone.setPosition(b.x, b.y).setSize(2 * b.r + 24, 2 * b.r + 24);
    this.invisLabel.setPosition(b.x, b.y);
    const ready = inv.charge >= 1;
    this.invisGfx.fillStyle(inv.active ? 0x6a7cff : ready ? 0x2a2a6a : 0x1a1a1a, 0.75).fillCircle(b.x, b.y, b.r);
    this.invisGfx.lineStyle(8, ready ? 0xa8b8ff : 0x5a5a7a, 1);
    this.invisGfx.beginPath();
    this.invisGfx.arc(b.x, b.y, b.r - 4, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(inv.charge, 1), false);
    this.invisGfx.strokePath();
    this.invisLabel.setAlpha(ready || inv.active ? 1 : 0.5);
  }

  update_({ timeSec, score, lives, maxLives = BALANCE.maxLives, armor = null, invis = null, level, xp, xpToNext }) {
    this.timeText.setText(formatTime(timeSec));
    this.scoreText.setText(`SCORE ${score}`);
    this.hearts.forEach((h, i) => h.setVisible(i < maxLives).setAlpha(i < lives ? 1 : 0.2));
    this.armorHeart.setVisible(!!armor).setAlpha(armor === 'on' ? 1 : 0.25).setX(PAD + 16 + maxLives * HEART_STEP);
    this.drawInvis(invis);
    this.levelText.setText(`LV ${level}`);

    const k = xpToNext > 0 ? Math.min(xp / xpToNext, 1) : 0;
    this.xpBar.clear();
    this.xpBar.fillStyle(0x000000, 0.5).fillRect(PAD, this.xpBarY(), XP_BAR.w, XP_BAR.h);
    this.xpBar.fillStyle(0x7ad3ff, 1).fillRect(PAD, this.xpBarY(), XP_BAR.w * k, XP_BAR.h);
  }
}
