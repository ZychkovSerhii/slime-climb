import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.santa;

/**
 * Санта (зима, рідкісний): пролітає поперек екрана на висоті y, гравця не б'є (harmless).
 * Вилетів за бічний край — з'являється з іншого (wraps разів), далі зникає. Збити — Шаги й рівень.
 */
export default class Santa extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('santa');
    const fromLeft = Math.random() < 0.5;
    super(scene, fromLeft ? -tex.width / 2 : width + tex.width / 2, CFG.y, 'santa', 'santa');
    this.scrollsWithWorld = false;
    this.harmless = true;
    this.vx = fromLeft ? 1 : -1;
    this.setFlipX(!fromLeft);
    this.play(animKey('santa', 'fly'));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    this.body.setVelocity(this.vx * CFG.speed * this.speedMul(this.scene.nowMs), 0);
    this.wrapEdges('x');
  }
}
