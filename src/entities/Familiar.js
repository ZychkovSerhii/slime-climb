import * as Phaser from 'phaser';
import { animKey } from '../art/sprites/index.js';

const HIT_PX = 18;

/**
 * Помічник гравця (шляпа, Оксанка, міні-сокира): сидить біля слизака у точці offset, кидається на найближчого видимого ворога,
 * влучає завжди (доводиться за ціллю), б'є damage() і повертається. Невмирущий, у фізиці не бере участі.
 * Цикл: home → (є ціль і минув restMs) → fly → hit → back → home.
 * Час — час гри (scene.nowMs), тож пауза зупиняє і помічника.
 */
export default class Familiar extends Phaser.GameObjects.Sprite {
  /**
   * @param {object} o { texture, anim, offset: {x, y}, speed, restMs, damage: () => number, tint, scale, spin }
   */
  constructor(scene, o) {
    super(scene, scene.player.x + o.offset.x, scene.player.y + o.offset.y, o.texture);
    scene.add.existing(this);
    this.o = o;
    this.state = 'home';
    this.readyAt = 0;
    this.target = null;
    this.setDepth(scene.player.depth + 1);
    if (o.tint) this.setTint(o.tint);
    if (o.scale) this.setScale(o.scale);
    if (o.anim) this.play(animKey(o.texture, o.anim));
  }

  get homeX() {
    const p = this.scene.player;
    // з боку стіни помічник не влізе — дзеркалимо зсув по x
    return p.x + (p.side === 'left' ? this.o.offset.x : -this.o.offset.x);
  }

  get homeY() {
    return this.scene.player.y + this.o.offset.y;
  }

  /** Крок (dt мс). Викликає GameScene.update. */
  step(dt) {
    const scene = this.scene;
    const now = scene.nowMs;
    const move = (tx, ty) => {
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      const stepPx = (this.o.speed * dt) / 1000;
      if (d <= stepPx) {
        this.setPosition(tx, ty);
        return true;
      }
      this.x += (dx / d) * stepPx;
      this.y += (dy / d) * stepPx;
      this.setRotation(this.o.spin ? this.rotation + dt * 0.02 : 0);
      return false;
    };

    if (this.state === 'home') {
      this.setPosition(this.homeX, this.homeY).setRotation(0);
      if (now < this.readyAt) return;
      const targets = scene.visibleEnemies();
      if (!targets.length) return;
      this.target = Phaser.Utils.Array.GetFirst(
        targets.slice().sort((a, b) => Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) - Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y)),
      );
      this.state = 'fly';
      return;
    }
    if (this.state === 'fly') {
      const t = this.target;
      if (!t || !t.active || t.invulnerable) {
        this.state = 'back';
        return;
      }
      if (move(t.x, t.y) || Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) < HIT_PX) {
        t.takeHit(this.o.damage(), null, now);
        scene.onFamiliarHit?.(t);
        this.state = 'back';
      }
      return;
    }
    // back
    if (move(this.homeX, this.homeY)) {
      this.state = 'home';
      this.readyAt = now + this.o.restMs;
    }
  }
}
