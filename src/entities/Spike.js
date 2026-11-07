import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';

/** Шип на внутрішньому краї стіни, вістрям у прохід. Їде вниз разом зі світом (група hazards). */
export default class Spike extends Phaser.Physics.Arcade.Image {
  constructor(scene, side, y) {
    const half = BALANCE.spikeHeight / 2;
    const x = side === 'left' ? BALANCE.wallWidth + half : scene.scale.width - BALANCE.wallWidth - half;
    super(scene, x, y, 'spike');
    this.side = side;
    scene.add.existing(this);
    this.setDisplaySize(BALANCE.spikeHeight, BALANCE.spikeHeight);
    if (side === 'right') this.setFlipX(true);
  }
}
