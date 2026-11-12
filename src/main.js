import * as Phaser from 'phaser';
import { BALANCE } from './config/balance.js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { codex, codexOpen } from './codex/index.js';
import { backAction } from './systems/Navigation.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import LevelUpScene from './scenes/LevelUpScene.js';
import ShopScene from './scenes/ShopScene.js';
import AchievementsScene from './scenes/AchievementsScene.js';
import BossIntroScene from './scenes/BossIntroScene.js';
import TuningScene from './scenes/TuningScene.js';

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b2a1b',
  physics: { default: 'arcade', arcade: { debug: false } },
  // кадр рушія не довший за maxDeltaMs: так фізика, твіни й таймери теж не «телепортуються» після підвисання
  fps: { min: 1000 / BALANCE.maxDeltaMs },
  scale: {
    // EXPAND: базова область 720×1280 завжди видна, а зайвий простір екрана (довший телефон — висота,
    // ширший екран — ширина) додається до гри, без чорних смуг. Сцени слухають подію resize.
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, HudScene, GameOverScene, LevelUpScene, ShopScene, AchievementsScene, BossIntroScene, TuningScene],
};

export const game = new Phaser.Game(config);

// Debug-режим: лічильник fps у кутку. У браузері — параметр ?debug=1,
// на телефоні (APK) — тимчасово постав DEBUG = true і перезбери.
const DEBUG = false;
const debugEnabled = DEBUG || new URLSearchParams(window.location.search).get('debug') === '1';
const FPS_REFRESH_MS = 500;
if (debugEnabled) {
  const fps = document.createElement('div');
  fps.style.cssText =
    'position:fixed;left:4px;bottom:4px;z-index:10;padding:2px 6px;font:14px monospace;color:#0f0;background:#000a;pointer-events:none';
  document.body.appendChild(fps);
  setInterval(() => {
    fps.textContent = `${game.loop.actualFps.toFixed(1)} fps`;
  }, FPS_REFRESH_MS);
}

// Android: застосунок згорнули — пауза з кнопкою «Продовжити».
// (У браузері те саме робить visibilitychange у GameScene.)
function pauseGame() {
  const scene = game.scene.getScene('Game');
  if (scene && scene.sys.isActive()) scene.pauseWithOverlay();
}
if (Capacitor.isNativePlatform()) {
  App.addListener('pause', pauseGame);
  App.addListener('resume', pauseGame);
  // Без цього слухача «Назад» закриває застосунок і забіг губиться
  App.addListener('backButton', () => {
    const active = game.scene.getScenes(true).map((s) => s.sys.settings.key);
    const gameScene = game.scene.getScene('Game');
    const action = backAction(active, Boolean(gameScene?.paused), codexOpen());
    if (action === 'closeCodex') codex().close();
    else if (action === 'pause') gameScene.pauseWithOverlay();
    else if (action === 'menu') {
      for (const key of ['GameOver', 'Shop', 'Achievements', 'Tuning']) game.scene.stop(key);
      game.scene.start('Menu');
    } else if (action === 'exit') App.exitApp();
  });
}

// Доступ до гри з консолі браузера — лише в режимі розробки (npm run dev)
if (import.meta.env.DEV) window.game = game;
