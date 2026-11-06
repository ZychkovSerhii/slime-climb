import * as Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import LevelUpScene from './scenes/LevelUpScene.js';

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b2a1b',
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: {
    // EXPAND: ширина 720 фіксована, висота розтягується під пропорції екрана (без чорних смуг)
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, HudScene, GameOverScene, LevelUpScene],
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
}

// Доступ до гри з консолі браузера — лише в режимі розробки (npm run dev)
if (import.meta.env.DEV) window.game = game;
