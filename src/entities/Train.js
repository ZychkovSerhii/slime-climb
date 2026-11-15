import { BALANCE } from '../config/balance.js';
import { addLeg, createSnake, divesClear, pathLength, pointAt, snakeLayout, upcomingDive } from '../systems/Snake.js';
import { sfx } from '../systems/Audio.js';
import Enemy from './Enemy.js';

const T = BALANCE.shkodko.train;
const N = T.snake;
const ARROW_COLOR = 0xffd23f;

/** Вагон: має HP (BALANCE.enemies.wagon), їде відносно екрана. Паровоз — той самий клас, але невразливий. */
class Car extends Enemy {
  constructor(scene, texture, loco) {
    super(scene, -2000, 0, texture, 'wagon');
    this.scrollsWithWorld = false;
    this.isLoco = loco;
    this.invulnerable = loco;
    this.setScale(T.carScale);
    this.setDepth(6);
  }

  spawned() {
    // спрайт повертається вздовж шляху, а тіло Arcade — ні: квадратне тіло однаково чесне і в рядах, і на пірнанні
    const side = Math.min(this.frame.width, this.frame.height);
    this.body.setSize(side, side, true);
  }
}

/**
 * Потяг Шкодька (фідбек-6 п.18): паровоз + wagons вагонів (×carScale) їдуть змійкою (systems/Snake.js) — рядами від
 * стіни до стіни у верхній частині екрана, вагони точно слідом за паровозом. Раз на diveEveryMs паровоз на кінці ряду
 * пірнає вздовж стіни до висоти гравця: за warnPx до того — свисток і блимаюча стрілка на тій стіні. Нове пірнання —
 * лише коли хвіст попереднього піднявся (одна стіна завжди вільна). Розбиті вагони зникають, лишаючи дірку.
 * onDone() — коли всі вагони розбиті. Стан на часі гри (scene.nowMs).
 */
export default class Train {
  constructor(scene, onDone) {
    this.scene = scene;
    this.onDone = onDone;
    this.loco = scene.spawnEnemy(new Car(scene, 'loco', true));
    this.wagons = [];
    for (let i = 0; i < T.wagons; i++) this.wagons.push(scene.spawnEnemy(new Car(scene, 'wagon', false)));
    const carW = this.loco.displayWidth;
    const carH = this.wagons[0]?.displayHeight ?? this.loco.displayHeight;
    this.spacing = carW + N.gapPx;
    this.layout = snakeLayout(scene.scale.width, scene.player.baseY, carW, carH);
    this.snake = createSnake(this.layout, this.wagons.length + 1, this.spacing);
    this.length = (this.wagons.length + 1) * this.spacing;
    this.nextDiveAt = scene.nowMs + N.firstDiveMs;
    this.lastNow = scene.nowMs;
    this.warned = null;
    this.gfx = scene.add.graphics().setDepth(5);
    this.finished = false;
    sfx('whistle');
  }

  get aliveWagons() {
    return this.wagons.filter((w) => w.active);
  }

  /** Крок; повертає паровоз (за ним визирає Шкодько). */
  update(now) {
    this.gfx.clear();
    if (this.finished) return this.loco;
    if (!this.aliveWagons.length) {
      this.finish();
      return this.loco;
    }
    const dt = Math.min(now - this.lastNow, 100);
    this.lastNow = now;
    this.snake = { ...this.snake, headD: this.snake.headD + (T.speed * this.loco.speedMul(now) * dt) / 1000 };
    this.grow(now);
    this.place();
    this.warn(now);
    return this.loco;
  }

  /** Шлях наперед: доки до кінця ближче за lookahead, дописуємо ряди; пірнання — за часом і якщо стіна звільнилась. */
  grow(now) {
    while (pathLength(this.snake.path) - this.snake.headD < N.warnPx + N.lookaheadPx) {
      const startD = pathLength(this.snake.path);
      const dive = now >= this.nextDiveAt && divesClear(this.snake.dives, startD, this.length);
      if (dive) this.nextDiveAt = now + N.diveEveryMs;
      this.snake = addLeg(this.snake, this.layout, dive);
    }
  }

  /** Вагони на шляху: i-й — на i·spacing позаду паровоза; розбиті пропускаємо (лишається дірка). */
  place() {
    const cars = [this.loco, ...this.wagons];
    cars.forEach((c, i) => {
      if (!c.active) return;
      const p = pointAt(this.snake.path, this.snake.headD - i * this.spacing);
      c.body.reset(p.x, p.y);
      // спрайти намальовані мордою ліворуч, колесами вниз
      const left = Math.cos(p.angle) < -0.01;
      const vertical = Math.abs(Math.sin(p.angle)) > 0.7;
      c.setFlipX(!left && !vertical);
      c.setRotation(vertical ? p.angle + Math.PI : 0);
    });
  }

  /** Попередження про пірнання: свисток раз і блимаюча стрілка вниз над гравцем на тій стіні. */
  warn(now) {
    const d = upcomingDive(this.snake.dives, this.snake.headD);
    if (!d) return;
    if (this.warned !== d) {
      this.warned = d;
      sfx('whistle');
    }
    if (Math.floor(now / 150) % 2) return;
    const x = this.layout.xEnd(d.side);
    const y = this.scene.player.baseY - 140;
    this.gfx.fillStyle(ARROW_COLOR, 0.9).fillTriangle(x - 28, y - 30, x + 28, y - 30, x, y + 20);
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
