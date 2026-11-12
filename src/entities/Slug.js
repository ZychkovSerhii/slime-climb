import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { kolyaBounds, spitterTarget } from '../systems/KolyaPlanner.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import SlimeSpit from './SlimeSpit.js';

const BITER = BALANCE.enemies.slugBiter;
const SPITTER = BALANCE.enemies.slugSpitter;
const WINDUP_MS = 350;
const WINDUP_TINT = 0xfff07a;

/**
 * Малий слимак Колі (фаза 80%, §9.2). kind 'biter' (кусака) — повзе по повітрю на гравця;
 * 'spitter' (личинка-стрілець) — тримається на keepPx над гравцем і плює раз на spitMs (перед плювком блимає).
 * kolyaMinion — на поділі й після смерті Колі такі зникають.
 */
export default class Slug extends Enemy {
  constructor(scene, x, y, kind) {
    super(scene, x, y, 'slug', kind === 'biter' ? 'slugBiter' : 'slugSpitter');
    this.kind = kind;
    this.kolyaMinion = true;
    this.scrollsWithWorld = false;
    this.nextSpitAt = scene.nowMs + SPITTER.firstSpitMs;
    this.windup = false;
    this.play({ key: animKey('slug', kind), startFrame: Phaser.Math.Between(0, 1) });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const p = scene.player;
    const now = scene.nowMs;
    const mul = this.speedMul(now);
    if (this.kind === 'biter') {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
      scene.physics.velocityFromRotation(angle, BITER.speed * (this.trait?.speedMul ?? 1) * mul, this.body.velocity); // посилений — швидший
      this.setFlipX(p.x < this.x);
      return;
    }
    const b = kolyaBounds(scene.scale.width, this.displayWidth / 2, p.baseY);
    const t = spitterTarget(p, this, b);
    const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
    if (d > 4) scene.physics.velocityFromRotation(Phaser.Math.Angle.Between(this.x, this.y, t.x, t.y), Math.min(SPITTER.speed * mul, d * 4), this.body.velocity);
    else this.body.setVelocity(0, 0);
    this.setFlipX(p.x < this.x);
    if (!this.isOnScreen()) return;
    const spitMul = Math.max(mul, 0.25);
    if (!this.windup && now >= this.nextSpitAt - WINDUP_MS) {
      this.windup = true;
      this.setTint(WINDUP_TINT);
    }
    if (now < this.nextSpitAt) return;
    this.windup = false;
    this.tintedSlow = undefined;
    this.clearTint();
    this.nextSpitAt = now + (this.trait?.spitMs ?? SPITTER.spitMs) / spitMul; // посилена — плює частіше
    const s = new SlimeSpit(scene, this.x, this.y);
    scene.enemyProjectiles.add(s);
    s.launch(p.x, p.y, BALANCE.kolya.spit.speed);
    sfx('spit');
  }
}
