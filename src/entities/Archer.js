import { BALANCE } from '../config/balance.js';
import { archerBand, archerMayFire } from '../systems/Grass.js';
import { sfx } from '../systems/Audio.js';
import { frameOf } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import Arrow from './Arrow.js';

const CFG = BALANCE.enemies.archer;
const WINDUP_TINT = 0xfff07a;

/** Стріла з (x, y) у гравця; спільна для лучника й вершника. */
export function shootArrow(scene, x, y) {
  const a = new Arrow(scene, x, y);
  scene.enemyProjectiles.add(a);
  a.launch(scene.player.x, scene.player.y, CFG.arrowSpeed);
  sfx('throw');
}

/**
 * Лучник у каптурі (біом 5): чіпляється за стіну side (де гравця немає) і ходить по ній угору-вниз у верхній частині
 * екрана (scrollsWithWorld = false). Стріла раз на fireMs, перед нею windupMs блимає жовтим; стріляє, лише коли вище
 * за гравця на minAbovePx (як квітка). За lifeMs іде вгору за екран. y — з якої висоти почати (вершник, що втратив павука).
 */
export default class Archer extends Enemy {
  constructor(scene, side, y = null) {
    const tex = scene.textures.getFrame('archer');
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : scene.scale.width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, y ?? -tex.height / 2, 'archer', 'archer');
    this.side = side;
    this.archer = true;
    this.scrollsWithWorld = false;
    this.setFlipX(side === 'right');
    this.band = archerBand(scene.scale.height);
    this.dir = 1;
    this.bornAt = scene.nowMs;
    this.nextFireAt = null;
    this.windupAt = null;
  }

  spawned() {
    this.body.setVelocity(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    const mul = this.speedMul(now);
    const leaving = now - this.bornAt >= CFG.lifeMs;
    if (leaving) {
      this.body.setVelocity(0, -CFG.speed * mul);
      if (this.y < -BALANCE.offscreenMarginPx) this.destroy();
      return;
    }
    if (this.y < this.band.minY) this.dir = 1;
    else if (this.y > this.band.maxY) this.dir = -1;
    this.body.setVelocity(0, this.dir * CFG.speed * mul);
    this.fire(now, Math.max(mul, 0.25));
  }

  fire(now, mul) {
    const scene = this.scene;
    const may = this.isOnScreen() && archerMayFire(this.y, scene.player.y);
    if (!may) {
      if (this.windupAt !== null) this.cancelWindup();
      if (this.nextFireAt !== null) this.nextFireAt = Math.max(this.nextFireAt, now + CFG.firstShotMs / mul);
      return;
    }
    if (this.nextFireAt === null) this.nextFireAt = now + CFG.firstShotMs / mul;
    if (this.windupAt === null) {
      if (now < this.nextFireAt - CFG.windupMs) return;
      this.windupAt = now;
      this.setTint(WINDUP_TINT).setFrame(frameOf('archer', 'draw'));
      return;
    }
    if (now < this.nextFireAt) return;
    this.cancelWindup();
    this.nextFireAt = now + CFG.fireMs / mul;
    shootArrow(scene, this.x, this.y);
  }

  cancelWindup() {
    this.windupAt = null;
    this.setFrame(frameOf('archer', 'idle'));
    this.tintedSlow = undefined; // відтінок перерахує Enemy
    if (this.baseTint !== null) this.setTint(this.baseTint);
    else this.clearTint();
  }
}
