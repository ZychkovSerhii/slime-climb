import * as Phaser from 'phaser';
import { buildArt, preloadArt } from '../art/textures.js';

/** Готує арт (src/art): PNG-заміни, текстури спрайтів і фонів, анімації. Далі — меню. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    preloadArt(this);
  }

  create() {
    buildArt(this);
    this.scene.start('Menu');
  }
}
