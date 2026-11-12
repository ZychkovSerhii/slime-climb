import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { applyDot, stepDot } from '../systems/Skills.js';
import { wrapAxis } from '../systems/Biome.js';
import { bossHp, enemyHp, enhanced, loopMul } from '../systems/Cycle.js';

// боси: свої блоки балансу, трішки сповільнюються, не «замерзають» (див. takeHit)
// kolyaPart — уламок Колі: HP задає сам бос при поділі
const BOSS_CFG = { boss: BALANCE.boss, shkodko: BALANCE.shkodko, kolya: BALANCE.kolya, kolyaPart: BALANCE.kolya, bear: BALANCE.bearBoss };
const TRAIT_TINT = BALANCE.traits.tint;
// посилені з кола 1 (етап 10, §10.1): ті, що мають запис у BALANCE.traits
const TRAIT_TYPES = new Set(Object.keys(BALANCE.traits).filter((k) => k !== 'tint'));

const SLOW_TINT = 0x6fa8ff;
const ICE_TINT = 0xa8ecff; // «Крижана атака»: ворог блідо-блакитний, «у кризі»
const ICE_ANIM_SPEED = 0.25; // і рухи майже завмирають
const ROOT_TINT = 0xe8e8e8; // приклеєний павутиною — білястий
const ROOT_MIN_MUL = 0; // приклеєний стоїть на місці

/**
 * Базовий ворог. Після додавання в групу enemies викликай spawned().
 * scrollsWithWorld: true — ворог «прикріплений» до світу і їде вниз разом зі стінами;
 * false — рухається відносно екрана (сам керує швидкістю).
 * invulnerable: true — влучання не шкодять, снаряди пролітають крізь, автоприціл ігнорує.
 * baseTint — власний відтінок (лють боса), поверх нього синій під сповільненням.
 * Подія сцени 'enemy:killed' { type, x, y } — коли hp ≤ 0.
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, type) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    this.type = type;
    this.isBoss = type in BOSS_CFG;
    // посилення (етап 10, §10.1): звичайні — HP ×1,15 за кожен пройдений біом (scene.biomeIdx), боси — ×1,5 за коло;
    // швидкість руху ×1,08 за коло (scene.loop — номер кола з 0)
    const loop = scene.loop ?? 0;
    this.biomeIdx = scene.biomeIdx ?? 0;
    this.hp = this.isBoss ? bossHp(BOSS_CFG[type].hp, loop) : enemyHp(BALANCE.enemies[type].hp, this.biomeIdx);
    this.loopSpeed = loopMul(loop).speed;
    // властивість посиленого ворога (з кола 1): холодний відтінок і зірочка; боси — +1 атака (кожен сам читає this.enhanced)
    this.enhanced = enhanced(loop);
    this.trait = this.enhanced && TRAIT_TYPES.has(type) ? BALANCE.traits[type] : null;
    this.star = null;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.scrollsWithWorld = true;
    this.invulnerable = false;
    this.baseTint = null;
    this.rootUntil = 0;
    this.dot = null;
    this.iceUntil = 0;
    this.frost = null;
    // зима: перехід за край (wrapEdges), harmless — дотик не шкодить (Санта)
    this.wrapsLeft = BALANCE.enemies[type]?.wraps ?? 0;
    this.harmless = false;
    if (this.trait) {
      this.baseTint = TRAIT_TINT;
      this.setTint(TRAIT_TINT);
      this.star = scene.add.image(x, y, 'traitStar').setDepth(this.depth + 2);
    }
  }

  /** Перевизначити HP (пінгвін 3–4, зимова миша): з тим самим множником біому. */
  setBaseHp(baseHp) {
    this.hp = this.isBoss ? bossHp(baseHp, this.scene.loop ?? 0) : enemyHp(baseHp, this.biomeIdx);
  }

  /**
   * Перехід за край (етап 6a): вилетів за верх/низ (axis 'x' — за бічний край) → з'являється з протилежного боку,
   * не більше wraps разів, далі зникає. Повертає false, якщо ворога знищено. Після переходу — onWrapped().
   */
  wrapEdges(axis = 'y') {
    const m = BALANCE.offscreenMarginPx;
    const { width, height } = this.scene.scale;
    const r = wrapAxis(this[axis], 0, axis === 'y' ? height : width, m, this.wrapsLeft);
    if (r.gone) {
      this.destroy();
      return false;
    }
    if (r.wrapped) {
      this[axis] = r.pos;
      this.wrapsLeft = r.wrapsLeft;
      this.onWrapped();
    }
    return true;
  }

  onWrapped() {}

  setBaseTint(color) {
    this.baseTint = color;
    this.tintedSlow = undefined; // перерахувати відтінок на наступному кадрі
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const now = this.scene.nowMs;
    // отрута «Ядовитої морди»: шкода тиками раз на секунду
    if (this.dot) {
      const r = stepDot(this.dot, now);
      this.dot = r.state;
      if (r.damage > 0) this.takeHit(r.damage, null, now);
      if (!this.active) return;
    }
    // під сповільненням ворог тонується синім, приклеєний павутиною — білим
    const rooted = now < this.rootUntil;
    const iced = now < this.iceUntil;
    const slowed = rooted ? 'root' : iced ? 'ice' : this.speedMul(now) < 1;
    if (slowed !== this.tintedSlow) {
      this.tintedSlow = slowed;
      if (this.anims) this.anims.timeScale = slowed === 'ice' ? ICE_ANIM_SPEED : 1;
      this.setFrost(slowed === 'ice');
      if (slowed === 'root') this.setTint(ROOT_TINT);
      else if (slowed === 'ice') this.setTint(ICE_TINT);
      else if (slowed) this.setTint(SLOW_TINT);
      else if (this.baseTint !== null) this.setTint(this.baseTint);
      else this.clearTint();
    }
    this.postUpdateFrost();
  }

  /** Кірка льоду поверх ворога (спрайт frost), поки діє «Крижана атака». */
  setFrost(on) {
    if (on && !this.frost) {
      this.frost = this.scene.add.image(this.x, this.y, 'frost').setDepth(this.depth + 1).setAlpha(0.8);
      const s = Math.max(this.displayWidth, this.displayHeight) / this.frost.width;
      this.frost.setScale(Math.min(s, 3));
    } else if (!on && this.frost) {
      this.frost.destroy();
      this.frost = null;
    }
  }

  postUpdateFrost() {
    if (this.frost) this.frost.setPosition(this.x, this.y);
    if (this.star) this.star.setPosition(this.x, this.y - this.displayHeight / 2 - 10).setVisible(this.visible && this.alpha > 0.3);
  }

  destroy(fromScene) {
    this.frost?.destroy();
    this.frost = null;
    this.star?.destroy();
    this.star = null;
    super.destroy(fromScene);
  }

  /** Викликається після додавання у фізичну групу (група скидає швидкість тіла). */
  spawned() {}

  speedMul(nowMs) {
    if (nowMs < this.rootUntil) return ROOT_MIN_MUL;
    return (nowMs < this.slowUntil ? this.slowFactor : 1) * this.loopSpeed;
  }

  /**
   * Влучання. fx — ефекти (systems/Skills.hitEffects): { slow, dot, root } або null.
   * Павутина не стакується: поки ворог приклеєний, нове влучання таймер не продовжує.
   */
  takeHit(damage, fx, nowMs) {
    if (!this.active || this.hp <= 0 || this.invulnerable) return;
    this.hp -= damage;
    if (fx?.slow) {
      // бос лише трішки сповільнюється (крига — на 5%)
      this.slowFactor = this.isBoss ? Math.max(fx.slow.factor, fx.slow.bossFactor ?? fx.slow.factor) : fx.slow.factor;
      this.slowUntil = nowMs + fx.slow.durationMs;
      // «заморожений» вигляд — лише звичайним ворогам: бос сповільнюється на 5%, застиглі лапи вводили б в оману
      if (fx.slow.ice && !this.isBoss) this.iceUntil = this.slowUntil;
    }
    if (fx?.dot) this.dot = applyDot(this.dot, fx.dot, nowMs);
    if (fx?.root && nowMs >= this.rootUntil) this.rootUntil = nowMs + (this.isBoss ? fx.root.bossMs : fx.root.ms);
    if (this.hp <= 0) {
      this.scene.events.emit('enemy:killed', { type: this.type, x: this.x, y: this.y });
      this.destroy();
    }
  }

  /** Швидкість на екрані (px/s): власна + прокрутка світу, якщо ворог їде разом зі світом. */
  screenVelocity(scrollPxPerSec) {
    const v = this.body ? this.body.velocity : { x: 0, y: 0 };
    return { vx: v.x, vy: v.y + (this.scrollsWithWorld ? scrollPxPerSec : 0) };
  }

  isOffscreen() {
    const m = BALANCE.offscreenMarginPx;
    const { width, height } = this.scene.scale;
    return this.x < -m || this.x > width + m || this.y < -m || this.y > height + m;
  }

  isOnScreen() {
    const { width, height } = this.scene.scale;
    return this.x >= 0 && this.x <= width && this.y >= 0 && this.y <= height;
  }
}
