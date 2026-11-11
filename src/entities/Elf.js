import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { sfx } from '../systems/Audio.js';
import Enemy from './Enemy.js';
import Candy from './Candy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.elf;
const WINDUP_TINT = 0xfff07a;

/**
 * Ельф (зима): з'являється згори і біжить на гравця. За homingStopPx перестає доворачувати —
 * інакше від нього не втекти; пролітає повз і переходить за край (wraps), знову доганяючи.
 * На екрані кидає льодяник-посох раз на throwMs, перед кидком windupMs блимає жовтим.
 */
export default class Elf extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('elf');
    const minX = BALANCE.wallWidth + tex.width / 2;
    super(scene, Phaser.Math.FloatBetween(minX, width - minX), -tex.height / 2, 'elf', 'elf');
    this.scrollsWithWorld = false;
    this.homing = true;
    this.dir = new Phaser.Math.Vector2(0, 1);
    this.nextThrowAt = null;
    this.windupAt = null;
    this.play({ key: animKey('elf', 'run'), startFrame: Phaser.Math.Between(0, 1) });
  }

  onWrapped() {
    this.homing = true;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const p = scene.player;
    const now = scene.nowMs;
    if (this.homing) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (d < CFG.homingStopPx) this.homing = false;
      else this.dir.set(p.x - this.x, p.y - this.y).normalize();
    }
    const speed = CFG.speed * this.speedMul(now);
    this.body.setVelocity(this.dir.x * speed, this.dir.y * speed);
    this.setFlipX(this.dir.x < 0);
    if (!this.wrapEdges('y')) return;
    this.stepThrow(now);
  }

  stepThrow(now) {
    const scene = this.scene;
    if (!this.isOnScreen()) {
      if (this.windupAt !== null) this.endWindup();
      return;
    }
    const mul = Math.max(this.speedMul(now), 0.25);
    if (this.nextThrowAt === null) this.nextThrowAt = now + CFG.firstThrowMs / mul;
    if (this.windupAt === null) {
      if (now >= this.nextThrowAt - CFG.windupMs) {
        this.windupAt = now;
        this.setTint(WINDUP_TINT);
      }
      return;
    }
    if (now < this.nextThrowAt) return;
    this.endWindup();
    this.nextThrowAt = now + CFG.throwMs / mul;
    const candy = new Candy(scene, this.x, this.y);
    scene.enemyProjectiles.add(candy);
    candy.launch(scene.player.x, scene.player.y, CFG.candySpeed);
    sfx('throw');
  }

  endWindup() {
    this.windupAt = null;
    this.tintedSlow = undefined; // відтінок перерахує Enemy
    this.clearTint();
  }
}
