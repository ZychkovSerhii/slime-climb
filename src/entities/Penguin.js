import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import WallWalker from './WallWalker.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.penguin;

/**
 * Пінгвін (зима, фідбек-3): ковзає на пузі вниз по стіні, де гравця немає, на slideSpeed швидше за світ.
 * Приходить «потягом» до groupMax. hp — 3–4 (Biome.penguinHp).
 */
export default class Penguin extends WallWalker {
  constructor(scene, side, y, hp) {
    super(scene, side, y, 'penguin', 'penguin', 'down');
    this.hp = hp;
    this.play({ key: animKey('penguin', 'slide'), startFrame: Phaser.Math.Between(0, 1) });
  }

  worldSpeed(now) {
    return -CFG.slideSpeed * this.speedMul(now);
  }
}
