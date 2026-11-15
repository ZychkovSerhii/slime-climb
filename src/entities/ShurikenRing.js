import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { orbitDamage, orbitPoints, shurikenStats } from '../systems/Skills.js';
import { sfx } from '../systems/Audio.js';

const R = BALANCE.skills.shuriken;

/**
 * Кільце сюрикенів скіла «Сюрикени» (фідбек-6 п.8): count сюрикенів крутяться довкола слизака на radius і б'ють
 * кожного видимого вразливого ворога, якого торкнуться (не частіше за hitCdMs на ворога). У фізиці не бере участі.
 * Час — scene.nowMs, тож пауза зупиняє кільце. Від сцени бере: player, progression, biomeIdx, nowMs, visibleEnemies.
 */
export default class ShurikenRing {
  constructor(scene) {
    this.scene = scene;
    this.blades = [];
    this.lastHit = new WeakMap(); // ворог → коли кільце било його востаннє
  }

  get stats() {
    return shurikenStats(this.scene.progression.picks.shuriken ?? 0);
  }

  /** Кількість сюрикенів за взяттями (кличе Combat після картки). */
  sync() {
    const { count } = this.stats;
    while (this.blades.length < count) {
      const b = this.scene.add.image(this.scene.player.x, this.scene.player.y, 'orbitShuriken');
      b.setDepth(this.scene.player.depth + 1);
      this.blades.push(b);
    }
  }

  /** Щокадру: позиції, обертання, удари. */
  step() {
    if (!this.blades.length) return;
    const scene = this.scene;
    const st = this.stats;
    const now = scene.nowMs;
    const pts = orbitPoints(scene.player.x, scene.player.y, this.blades.length, st.radius, now);
    this.blades.forEach((b, i) => b.setPosition(pts[i].x, pts[i].y).setRotation(now / 60));
    const mul = BALANCE.scaling.biomeHpMul ** (scene.biomeIdx ?? 0);
    let hit = false;
    for (const e of scene.visibleEnemies()) {
      if ((this.lastHit.get(e) ?? -Infinity) + R.hitCdMs > now) continue;
      const reach = R.hitPx + Math.min(e.displayWidth, e.displayHeight) / 2;
      if (!pts.some((p) => Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y) <= reach)) continue;
      this.lastHit.set(e, now);
      e.takeHit(orbitDamage(st.damage, mul, e.isBoss), null, now);
      hit = true;
    }
    if (hit) sfx('hit');
  }
}
