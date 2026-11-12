import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.spark;

/**
 * Іскра (лава, §11.2): з'являється згори і летить до гравця зигзагом (поперечне відхилення zigzagPx з періодом zigzagMs).
 * Убита — розпадається на дрібні (GameScene.onKilled → Lava.sparkSplit).
 */
export default class Spark extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('spark');
    const minX = BALANCE.wallWidth + tex.width / 2;
    super(scene, Phaser.Math.FloatBetween(minX, width - minX), -tex.height / 2, 'spark', 'spark');
    this.scrollsWithWorld = false;
    this.phase = Math.random() * Math.PI * 2;
    this.play({ key: animKey('spark', 'fly'), startFrame: Phaser.Math.Between(0, 1) });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const p = scene.player;
    const now = scene.nowMs;
    const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    const w = (2 * Math.PI) / CFG.zigzagMs;
    // поперечна швидкість — похідна від zigzagPx·sin(w·t)
    const side = CFG.zigzagPx * w * 1000 * Math.cos(w * now + this.phase);
    const v = CFG.speed * this.speedMul(now);
    this.body.setVelocity(Math.cos(a) * v - Math.sin(a) * side * 0.5, Math.sin(a) * v + Math.cos(a) * side * 0.5);
  }
}
