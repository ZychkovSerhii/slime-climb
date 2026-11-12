import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { animKey, frameOf } from '../art/sprites/index.js';

const D = BALANCE.lava.drop;

/**
 * Лавова крапля (лава, §11.2): перешкода в групі hazards, як шип (є side — для резервів стін її видно як шип).
 * swellMs набухає на верхньому краю стіни side, потім стікає вниз зі швидкістю speed (відносно екрана,
 * scrollsWithWorld = false). Незнищенна; за нижнім краєм зникає.
 */
export default class LavaDrop extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, side) {
    const tex = scene.textures.getFrame('lavaDrop');
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : scene.scale.width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, tex.height / 2, 'lavaDrop', 0);
    this.side = side;
    this.lavaDrop = true;
    this.scrollsWithWorld = false;
    scene.add.existing(this);
    if (side === 'right') this.setFlipX(true);
    this.runAt = scene.nowMs + D.swellMs;
    this.running = false;
    this.play(animKey('lavaDrop', 'swell'));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    if (!this.running && this.scene.nowMs >= this.runAt) {
      this.running = true;
      this.stop();
      this.setFrame(frameOf('lavaDrop', 'run'));
    }
    this.body.setVelocity(0, this.running ? D.speed : 0);
    if (this.y > this.scene.scale.height + this.height) this.destroy();
  }
}
