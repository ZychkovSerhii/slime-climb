import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import { animKey } from '../art/sprites/index.js';

const CFG = BALANCE.enemies.penguin;
const WARN_TINT = 0xfff07a;

/**
 * Пінгвін (етап 10, §10.3): з'являється вгорі біля стіни side, блимає warnMs (стоїть, нешкідливий), потім ковзає
 * на пузі по прямій у точку, де гравець у момент старту, на slideSpeed. Ухилитися — стрибнути на іншу стіну.
 * Вилетів за край — wraps разів з'являється згори біля протилежної стіни і знову атакує (з попередженням).
 * hp — 3–4 (Biome.penguinHp) з множником біому.
 */
export default class Penguin extends Enemy {
  constructor(scene, side, hp) {
    const tex = scene.textures.getFrame('penguin');
    super(scene, 0, CFG.edgeY, 'penguin', 'penguin');
    this.halfW = tex.width / 2;
    this.setBaseHp(hp);
    this.scrollsWithWorld = false;
    this.dir = new Phaser.Math.Vector2(0, 1);
    this.play({ key: animKey('penguin', 'slide'), startFrame: Phaser.Math.Between(0, 1) });
    this.placeAt(side);
  }

  /** Вгорі біля стіни side: попередження, потім ривок. */
  placeAt(side) {
    const { width } = this.scene.scale;
    const m = BALANCE.wallWidth + this.halfW;
    this.side = side;
    this.setPosition(side === 'left' ? m : width - m, CFG.edgeY);
    this.warnUntil = this.scene.nowMs + CFG.warnMs;
    this.harmless = true;
    this.setRotation(Math.PI / 2);
    this.setFlipY(side === 'right');
    this.setTint(WARN_TINT);
    this.blink?.stop();
    this.blink = this.scene.tweens.add({ targets: this, alpha: 0.35, duration: CFG.warnMs / 4, yoyo: true, repeat: 1 });
  }

  spawned() {
    this.body.setVelocity(0, 0);
  }

  /** Кінець попередження: напрям — на гравця; спрайт намальований головою праворуч, повертаємо по руху. */
  launch() {
    const p = this.scene.player;
    this.warnUntil = null;
    this.harmless = false;
    this.blink?.stop();
    this.setAlpha(1);
    this.tintedSlow = undefined; // відтінок перерахує Enemy
    this.clearTint();
    this.dir.set(p.x - this.x, p.y - this.y).normalize();
    this.setRotation(this.dir.angle());
    this.setFlipY(this.dir.x < 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const now = this.scene.nowMs;
    if (this.warnUntil !== null) {
      this.body.setVelocity(0, 0);
      if (now >= this.warnUntil) this.launch();
      return;
    }
    const speed = CFG.slideSpeed * this.speedMul(now);
    this.body.setVelocity(this.dir.x * speed, this.dir.y * speed);
    if (!this.isOffscreen()) return;
    if (this.wrapsLeft > 0) {
      this.wrapsLeft -= 1;
      this.placeAt(this.side === 'left' ? 'right' : 'left');
    } else this.destroy();
  }

  destroy(fromScene) {
    this.blink?.stop();
    super.destroy(fromScene);
  }
}
