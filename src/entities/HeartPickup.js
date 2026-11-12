import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

/**
 * Сердечко (етап 10, §10.5): стоїть на стіні side там, де слизак торкається стіни, і їде разом зі світом.
 * Дотик — +1 життя (група pickups; GameScene.collectGift розрізняє за kind). Спрайт — 'heart' з HUD.
 */
export default class HeartPickup extends Phaser.Physics.Arcade.Image {
  constructor(scene, side, y) {
    super(scene, scene.player.wallX(side), y, 'heart');
    scene.add.existing(this);
    this.kind = 'heart';
    this.side = side;
    this.scrollsWithWorld = true;
    this.setScale(BALANCE.heart.scale);
    // пульсує, щоб його було видно на тлі стіни
    scene.tweens.add({ targets: this, scale: BALANCE.heart.scale * 1.18, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
