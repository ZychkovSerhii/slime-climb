import { BALANCE } from '../config/balance.js';
import { nextSwarmSize } from '../systems/BossPlanner.js';
import SmallSpider from './SmallSpider.js';

const S = BALANCE.boss.swarm;
const GOLDEN_ANGLE = 2.39996;
const EXIT_MARGIN = 60;
const WOBBLE_PX_S = 40; // легке «тремтіння» кожного павучка, щоб зграя виглядала живою

/**
 * Рій павучиці (фаза 2). Не спрайт, а контролер: тримає зграю павучків строєм і веде її.
 * Захід: зграя летить на гравця (доводиться, поки вище за нього на homingStopPx), далі — прямо,
 * пролітає повз і зникає за краєм. Ті, хто вижив, через pauseMs заходять згори знову, +1 павучок (до max).
 * Коли всіх убито — викликає onDone. Таймери на часі гри (nowMs), тож пауза гри їх зупиняє.
 */
export default class Swarm {
  constructor(scene, onDone) {
    this.scene = scene;
    this.onDone = onDone;
    this.spiders = [];
    this.survivors = 0;
    this.state = 'idle'; // 'flying' | 'pause' | 'done'
    this.pauseUntil = 0;
    this.passes = 0;
  }

  /** Новий захід з n павучків навколо (x, y). */
  launch(n, x, y) {
    const scene = this.scene;
    this.center = { x, y };
    this.locked = false;
    this.survivors = 0;
    this.passes += 1;
    this.spiders = [];
    for (let i = 0; i < n; i++) {
      const r = S.spreadPx * Math.sqrt((i + 0.5) / n);
      const a = i * GOLDEN_ANGLE;
      const sp = scene.spawnEnemy(new SmallSpider(scene, x + r * Math.cos(a), y + r * Math.sin(a), { controlled: true }));
      sp.wobblePhase = i * 1.7;
      this.spiders.push(sp);
    }
    this.aim();
    this.state = 'flying';
  }

  /** Напрямок зграї — на гравця. */
  aim() {
    const p = this.scene.player;
    const dx = p.x - this.center.x;
    const dy = p.y - this.center.y;
    const d = Math.hypot(dx, dy) || 1;
    this.vel = { x: (dx / d) * S.speed, y: (dy / d) * S.speed };
  }

  update(delta) {
    const scene = this.scene;
    if (scene.paused || this.state === 'done' || this.state === 'idle') return;
    if (this.state === 'pause') {
      if (scene.nowMs >= this.pauseUntil) {
        const { width } = scene.scale;
        const lane = BALANCE.wallWidth + S.spreadPx;
        this.launch(this.nextSize, lane + Math.random() * (width - 2 * lane), -S.spreadPx - 40);
      }
      return;
    }

    const dt = delta / 1000;
    this.center.x += this.vel.x * dt;
    this.center.y += this.vel.y * dt;
    if (!this.locked) {
      if (this.center.y < scene.player.y - S.homingStopPx) this.aim();
      else this.locked = true;
    }

    const { width, height } = scene.scale;
    const t = scene.nowMs / 1000;
    for (const sp of this.spiders) {
      if (!sp.active || !sp.body) continue;
      const out = sp.y > height + EXIT_MARGIN || sp.x < -EXIT_MARGIN || sp.x > width + EXIT_MARGIN;
      // повз гравця пролетів і зник за краєм — вижив
      if (out) {
        this.survivors += 1;
        sp.destroy();
        continue;
      }
      sp.body.setVelocity(this.vel.x + Math.sin(t * 6 + sp.wobblePhase) * WOBBLE_PX_S, this.vel.y);
    }
    this.spiders = this.spiders.filter((sp) => sp.active);
    if (this.spiders.length > 0) return;

    this.nextSize = nextSwarmSize(this.survivors);
    if (this.nextSize === 0) {
      this.state = 'done';
      this.onDone();
      return;
    }
    this.state = 'pause';
    this.pauseUntil = scene.nowMs + S.pauseMs;
  }

  destroy() {
    for (const sp of this.spiders) sp.destroy();
    this.spiders = [];
    this.state = 'done';
  }
}
