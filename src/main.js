import * as Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';

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
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
};

export const game = new Phaser.Game(config);

// Доступ до гри з консолі браузера — лише в режимі розробки (npm run dev)
if (import.meta.env.DEV) window.game = game;
