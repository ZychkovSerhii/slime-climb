import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { blastHits, bombFuseMs } from '../systems/ShkodkoPlanner.js';
import { blastVictims } from '../systems/ShkodkoLoot.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';

const S = BALANCE.shkodko.bomb;
const ARC_PX = 90; // наскільки дуга кидка вища за пряму
const BLAST_COLOR = 0xffb347;
const FRIENDLY_COLOR = 0x9be86a; // свої бомби (картки Шкодька) — зелений вибух, щоб не плутати з ворожими
const F = BALANCE.shkodkoLoot.bomb;

/**
 * Подарунок-бомба Шкодька (група scene.bombs). Летить дугою в точку (tx, ty) за flightMs відносно екрана,
 * потім лежить і їде зі світом, блимає і через запал вибухає. Гравець у радіусі — мінус життя (scene.hurtPlayer).
 * Час — scene.nowMs, тож пауза зупиняє і політ, і запал.
 * friendly (картки Шкодька, етап 6c): кидає слизак, вибухає швидше і б'є ворогів у радіусі на damage, гравцю не шкодить.
 * Такі бомби не лежать у scene.bombs (їх читає бот як небезпеку і гасить смерть боса).
 */
export default class GiftBomb extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, tx, ty, opts = null) {
    super(scene, x, y, 'giftBomb', 'bomb');
    this.friendly = Boolean(opts?.friendly);
    this.damage = opts?.damage ?? 0;
    this.flightMs = this.friendly ? F.flightMs : S.flightMs;
    if (this.friendly) this.setScale(0.75);
    scene.add.existing(this);
    this.setDepth(5);
    this.scrollsWithWorld = false; // у польоті — відносно екрана
    this.from = { x, y };
    this.to = { x: tx, y: ty };
    this.t0 = scene.nowMs;
    this.landed = false;
    this.explodeAt = 0;
    this.radius = this.friendly ? F.radiusPx : S.radiusPx; // радіус вибуху (його читає і бот-плейтест)
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const scene = this.scene;
    if (!scene || scene.paused) return;
    const now = scene.nowMs;
    if (!this.landed) {
      const k = Math.min((now - this.t0) / this.flightMs, 1);
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
    this.explodeAt = now + (this.friendly ? F.fuseMs : bombFuseMs(Math.random));
    this.play(animKey('giftBomb', 'blink'));
  }

  explode() {
    const scene = this.scene;
    sfx('boom');
    const ring = scene.add.circle(this.x, this.y, this.radius, this.friendly ? FRIENDLY_COLOR : BLAST_COLOR, 0.45).setDepth(this.depth + 1);
    scene.tweens.add({ targets: ring, alpha: 0, scale: 1.15, duration: 280, onComplete: () => ring.destroy() });
    if (this.friendly) {
      const alive = scene.enemies.getChildren().filter((e) => e.active && e.hp > 0 && !e.invulnerable);
      for (const e of blastVictims(this, alive, this.radius)) e.takeHit(this.damage, null, scene.nowMs);
    } else if (!scene.dead && blastHits(this, scene.player)) scene.hurtPlayer();
    this.destroy();
  }
}
