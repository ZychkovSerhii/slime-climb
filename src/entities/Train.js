import { BALANCE } from '../config/balance.js';
import { trainGone, trainLayout } from '../systems/ShkodkoPlanner.js';
import { sfx } from '../systems/Audio.js';
import Enemy from './Enemy.js';

const T = BALANCE.shkodko.train;
const COUPLING_COLOR = 0x8a9aa0;
const ARROW_COLOR = 0xffd23f;

/** Вагон: має HP (BALANCE.enemies.wagon), їде відносно екрана. Паровоз — той самий клас, але невразливий. */
class Car extends Enemy {
  constructor(scene, texture, loco) {
    super(scene, -200, 0, texture, 'wagon');
    this.scrollsWithWorld = false;
    this.isLoco = loco;
    this.invulnerable = loco;
    this.setDepth(6);
  }
}

/**
 * Потяг Шкодька: паровоз + вагони на довгій зчіпці (рішення §6.2). Проїжджає горизонтально на висоті гравця
 * (scene.player.baseY), виїжджає з протилежного боку, пауза, попередження (свисток + стрілка) і знову — з іншого боку.
 * Розбиті вагони зникають. onDone() — коли всі вагони розбиті й потяг виїхав.
 * Стан на часі гри (scene.nowMs).
 */
export default class Train {
  constructor(scene, onDone) {
    this.scene = scene;
    this.onDone = onDone;
    this.loco = scene.spawnEnemy(new Car(scene, 'loco', true));
    this.wagons = [];
    for (let i = 0; i < T.wagons; i++) this.wagons.push(scene.spawnEnemy(new Car(scene, 'wagon', false)));
    this.gfx = scene.add.graphics().setDepth(5);
    this.dir = scene.player.side === 'left' ? -1 : 1; // перший раз — назустріч слизакові
    this.finished = false;
    this.warn(scene.nowMs);
  }

  get aliveWagons() {
    return this.wagons.filter((w) => w.active);
  }

  get cars() {
    return [this.loco, ...this.aliveWagons];
  }

  warn(now) {
    this.state = 'warn';
    this.until = now + T.warnMs;
    for (const c of this.cars) {
      c.body.setVelocity(0, 0);
      c.setVisible(false);
      c.body.enable = false;
    }
    sfx('whistle');
  }

  start() {
    const scene = this.scene;
    const y = scene.player.baseY;
    const cars = this.cars;
    const xs = trainLayout(cars.length, this.dir, scene.scale.width, this.loco.width);
    cars.forEach((c, i) => {
      c.setPosition(xs[i], y).setVisible(true).setFlipX(this.dir > 0);
      c.body.enable = true;
    });
    this.state = 'run';
  }

  /** Крок; повертає паровоз (за ним визирає Шкодько). */
  update(now) {
    const scene = this.scene;
    this.gfx.clear();
    if (this.finished) return this.loco;
    if (this.state === 'warn') {
      this.drawArrow(now);
      if (now >= this.until) this.start();
    } else if (this.state === 'run') {
      const mul = this.loco.speedMul(now);
      const cars = this.cars;
      for (const c of cars) c.body.setVelocity(this.dir * T.speed * mul, 0);
      this.drawCouplings(cars);
      if (trainGone(cars.map((c) => c.x), this.dir, scene.scale.width, this.loco.width)) {
        if (!this.aliveWagons.length) this.finish();
        else {
          this.dir = -this.dir;
          this.state = 'pause';
          this.until = now + T.pauseMs;
          for (const c of cars) c.body.setVelocity(0, 0);
        }
      }
    } else if (this.state === 'pause' && now >= this.until) {
      this.warn(now);
    }
    return this.loco;
  }

  /** Зчіпка: тонка лінія між сусідніми вагонами, щоб розчеплені вагони читалися як один потяг. */
  drawCouplings(cars) {
    this.gfx.lineStyle(2, COUPLING_COLOR, 0.7);
    for (let i = 1; i < cars.length; i++) {
      const a = cars[i - 1];
      const b = cars[i];
      this.gfx.lineBetween(a.x, a.y + 10, b.x, b.y + 10);
    }
  }

  /** Блимаюча стрілка з того боку, звідки поїде потяг, на висоті гравця. */
  drawArrow(now) {
    if (Math.floor(now / 150) % 2) return;
    const scene = this.scene;
    const y = scene.player.baseY;
    const x = this.dir > 0 ? BALANCE.wallWidth + 10 : scene.scale.width - BALANCE.wallWidth - 10;
    const d = this.dir * 26;
    this.gfx.fillStyle(ARROW_COLOR, 0.9).fillTriangle(x, y - 18, x, y + 18, x + d, y);
  }

  finish() {
    this.finished = true;
    this.loco.destroy();
    this.gfx.clear();
    this.onDone();
  }

  destroy() {
    for (const c of [this.loco, ...this.wagons]) if (c.active) c.destroy();
    this.gfx.destroy();
  }
}
