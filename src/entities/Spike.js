import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

/**
 * Шип на внутрішньому краї стіни, вістрям у прохід. Їде вниз разом зі світом (група hazards).
 * texture — 'spike' (печера) або 'icicle' (зима): той самий розмір, тож хітбокс однаковий.
 */
export default class Spike extends Phaser.Physics.Arcade.Image {
  constructor(scene, side, y, texture = 'spike') {
    const half = BALANCE.spikeHeight / 2;
    const x = side === 'left' ? BALANCE.wallWidth + half : scene.scale.width - BALANCE.wallWidth - half;
    super(scene, x, y, texture);
    this.side = side;
    scene.add.existing(this);
    this.setDisplaySize(BALANCE.spikeHeight, BALANCE.spikeHeight);
    if (side === 'right') this.setFlipX(true);
  }
}
