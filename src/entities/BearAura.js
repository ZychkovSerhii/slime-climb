import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';

const A = BALANCE.bearBoss.aura;
const COLOR = 0xcfe8ff;

/**
 * Аура ричання білого ведмедя (етап 10, §10.2): коло з власним HP (aura.hp × множник біому) довкола ведмедя.
 * Поки ціла, ведмідь невразливий — кулі б'ють у неї. Дотик сповільнює гравця (onTouch → GameScene.roarPlayer), не шкодить.
 * Зникає, коли розбита або через aura.ms. Тіло — коло radiusPx; спрайт-носій невидимий, коло малює Graphics.
 */
export default class BearAura extends Enemy {
  constructor(scene, bear) {
    super(scene, bear.x, bear.y, 'traitStar', 'bearAura');
    this.bear = bear;
    this.setBaseHp(A.hp);
    this.maxHp = this.hp;
    this.scrollsWithWorld = false;
    this.harmless = true;
    this.bossMinion = true;
    this.setAlpha(0);
    this.until = scene.nowMs + A.ms;
    this.ring = scene.add.graphics().setDepth(this.depth + 1);
  }

  spawned() {
    const r = A.radiusPx;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.body.setVelocity(0, 0);
  }

  /** Дотик гравця: сповільнення, як колишнє ричання. */
  onTouch() {
    this.scene.roarPlayer();
  }

  /** Зірочка посилених аурі не потрібна; HP аури в смузі боса не показуємо. */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    if (!this.bear.active || this.scene.nowMs >= this.until) {
      this.destroy();
      return;
    }
    this.setPosition(this.bear.x, this.bear.y);
    this.body.setVelocity(0, 0);
    const k = Math.max(this.hp, 0) / this.maxHp;
    this.ring.clear();
    this.ring.fillStyle(COLOR, 0.08 + 0.12 * k).fillCircle(this.x, this.y, A.radiusPx);
    this.ring.lineStyle(4, COLOR, 0.3 + 0.5 * k).strokeCircle(this.x, this.y, A.radiusPx);
  }

  destroy(fromScene) {
    this.ring?.destroy();
    this.ring = null;
    const bear = this.bear;
    super.destroy(fromScene);
    bear?.onAuraGone?.();
  }
}
