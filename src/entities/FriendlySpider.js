import { BALANCE } from '../config/balance.js';
import { animKey } from '../art/sprites/index.js';
import { pickNearest } from '../systems/Targeting.js';
import { sfx } from '../systems/Audio.js';

const S = BALANCE.forms.swarm;
const TINT = 0x9cff57; // свої павучки — зелені, щоб не плутати з ворожим роєм
const BULLET_PX = 18;

/**
 * Павучок рою «Ти став павуком» (фідбек-8): летить до найближчого видимого ворога, кусає раз на S.damage і зникає.
 * Має 1 HP: гине від ворожої кулі чи від удару ворога (кусь і є зіткнення). Без цілей кружляє біля слизака.
 * Не фізичне тіло — все за відстанями, як шляпа. step(dt) → false, коли павучка вже немає.
 */
export default class FriendlySpider {
  constructor(scene, x, y, i) {
    this.scene = scene;
    this.i = i;
    this.until = scene.nowMs + S.lifeMs;
    this.sprite = scene.add.sprite(x, y, 'smallSpider').setTint(TINT).setDepth(scene.player.depth + 1);
    this.sprite.play(animKey('smallSpider', 'crawl'));
    this.target = null;
  }

  step(dt, targets) {
    const scene = this.scene;
    const sp = this.sprite;
    if (scene.nowMs >= this.until) return this.die(false);
    // ворожа куля збиває павучка (1 HP)
    for (const b of scene.enemyProjectiles.getChildren()) {
      if (b.active && Math.hypot(b.x - sp.x, b.y - sp.y) < BULLET_PX) {
        b.destroy();
        return this.die(true);
      }
    }
    if (!this.target?.active || this.target.hp <= 0 || this.target.invulnerable) this.target = targets.length ? pickNearest(sp, targets) : null;
    let tx;
    let ty;
    if (this.target) {
      tx = this.target.x;
      ty = this.target.y;
    } else {
      const a = (scene.nowMs / 600) + (this.i * Math.PI * 2) / S.count;
      tx = scene.player.x + Math.cos(a) * 60;
      ty = scene.player.y + Math.sin(a) * 40;
    }
    const dx = tx - sp.x;
    const dy = ty - sp.y;
    const d = Math.hypot(dx, dy);
    const stepPx = (S.speed * dt) / 1000;
    if (this.target) {
      const reach = S.hitPx + Math.min(this.target.displayWidth, this.target.displayHeight) / 2;
      if (d <= reach) {
        this.target.takeHit(S.damage, null, scene.nowMs);
        sfx('bite');
        return this.die(false);
      }
    }
    if (d > 0.5) {
      const k = Math.min(stepPx, d) / d;
      sp.setPosition(sp.x + dx * k, sp.y + dy * k);
      sp.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
    }
    return true;
  }

  die(hit) {
    if (hit) {
      const s = this.scene;
      const poof = s.add.circle(this.sprite.x, this.sprite.y, 10, TINT, 0.6).setDepth(this.sprite.depth);
      s.tweens.add({ targets: poof, alpha: 0, scale: 1.8, duration: 200, onComplete: () => poof.destroy() });
    }
    this.sprite.destroy();
    return false;
  }

  destroy() {
    this.sprite.destroy();
  }
}
