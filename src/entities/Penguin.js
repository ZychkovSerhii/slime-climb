import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.penguin;

/**
 * Пінгвін (зима): ковзає на пузі по прямій у точку, де гравець був у момент появи.
 * Після переходу за край знову цілиться в гравця. hp — 3–4 (Biome.penguinHp).
 */
export default class Penguin extends Enemy {
  constructor(scene, x, y, hp) {
    super(scene, x, y, 'penguin', 'penguin');
    this.hp = hp;
    this.scrollsWithWorld = false;
    this.dir = new Phaser.Math.Vector2(0, 1);
    this.aim();
    this.play({ key: animKey('penguin', 'slide'), startFrame: Phaser.Math.Between(0, 1) });
  }

  /** Напрям — на гравця; спрайт намальований головою праворуч, тож повертаємо по руху. */
  aim() {
    const p = this.scene.player;
    this.dir.set(p.x - this.x, p.y - this.y).normalize();
    this.setRotation(this.dir.angle());
    this.setFlipY(this.dir.x < 0);
  }

  onWrapped() {
    this.aim();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const speed = CFG.speed * this.speedMul(this.scene.nowMs);
    this.body.setVelocity(this.dir.x * speed, this.dir.y * speed);
    this.wrapEdges('y');
  }
}
