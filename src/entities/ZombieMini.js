import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.zombieMini;
const SCALE = 0.45; // спрайт мерця 96×128 → ~43×58, «розміром зі слизака» (ТЗ)

/**
 * Малий мрець (Мрець-Велетень на 65%): з'являється згори і йде на гравця (відносно екрана); ближче homingStopPx
 * перестає доворачувати — від нього можна відстрибнути. Прислужник боса (bossMinion): зникає разом із ним.
 * Убитий — з шансом flesh.chance лишає гнилу плоть на найближчій стіні (SpawnDirector.dropFlesh).
 */
export default class ZombieMini extends Enemy {
  constructor(scene, x) {
    super(scene, x, -40, 'zombie', 'zombieMini');
    this.setScale(SCALE);
    this.scrollsWithWorld = false;
    this.bossMinion = true;
    this.homing = true;
    this.play(animKey('zombie', 'walk'));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active || !this.body) return;
    const p = this.scene.player;
    if (this.homing) {
      if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) <= CFG.homingStopPx) this.homing = false;
      else {
        const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
        this.scene.physics.velocityFromRotation(a, CFG.speed * this.speedMul(this.scene.nowMs), this.body.velocity);
      }
    }
    if (this.y > 0 && this.isOffscreen()) this.destroy();
  }

  takeHit(damage, fx, nowMs) {
    const { x, y, scene } = this; // після смерті this.scene уже порожній
    super.takeHit(damage, fx, nowMs);
    if (!this.active && this.hp <= 0) scene?.spawner?.dropFlesh(x, y);
  }
}
