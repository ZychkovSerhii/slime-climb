import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { blastHits, bombFuseMs } from '../systems/ShkodkoPlanner.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';

const S = BALANCE.shkodko.bomb;
const ARC_PX = 90; // наскільки дуга кидка вища за пряму
const BLAST_COLOR = 0xffb347;

/**
 * Подарунок-бомба Шкодька (група scene.bombs). Летить дугою в точку (tx, ty) за flightMs відносно екрана,
 * потім лежить і їде зі світом, блимає і через запал вибухає. Гравець у радіусі — мінус життя (scene.hurtPlayer).
 * Час — scene.nowMs, тож пауза зупиняє і політ, і запал.
 */
export default class GiftBomb extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, tx, ty) {
    super(scene, x, y, 'giftBomb', 'bomb');
    scene.add.existing(this);
    this.setDepth(5);
    this.scrollsWithWorld = false; // у польоті — відносно екрана
    this.from = { x, y };
    this.to = { x: tx, y: ty };
    this.t0 = scene.nowMs;
    this.landed = false;
    this.explodeAt = 0;
    this.radius = S.radiusPx; // радіус вибуху (його читає і бот-плейтест)
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const scene = this.scene;
    if (!scene || scene.paused) return;
    const now = scene.nowMs;
    if (!this.landed) {
      const k = Math.min((now - this.t0) / S.flightMs, 1);
      this.x = Phaser.Math.Linear(this.from.x, this.to.x, k);
      this.y = Phaser.Math.Linear(this.from.y, this.to.y, k) - Math.sin(Math.PI * k) * ARC_PX;
      this.rotation = k * Math.PI * 2;
      if (k >= 1) this.land(now);
      return;
    }
    if (now >= this.explodeAt) this.explode();
  }

  land(now) {
    this.landed = true;
    this.rotation = 0;
    this.scrollsWithWorld = true; // лежить і їде зі світом, як шип
    this.explodeAt = now + bombFuseMs(Math.random);
    this.play(animKey('giftBomb', 'blink'));
  }

  explode() {
    const scene = this.scene;
    sfx('boom');
    const ring = scene.add.circle(this.x, this.y, S.radiusPx, BLAST_COLOR, 0.45).setDepth(this.depth + 1);
    scene.tweens.add({ targets: ring, alpha: 0, scale: 1.15, duration: 280, onComplete: () => ring.destroy() });
    if (!scene.dead && blastHits(this, scene.player)) scene.hurtPlayer();
    this.destroy();
  }
}
