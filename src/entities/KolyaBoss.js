import { BALANCE } from '../config/balance.js';
import { afterPartDeath, createLungeClock, eatHeal, kolyaHpFloor, kolyaPhase, splitHp } from '../systems/KolyaPlanner.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import KolyaBody from './KolyaBody.js';
import KolyaPart from './KolyaPart.js';
import Slug from './Slug.js';

const K = BALANCE.kolya;
const RAGE_TINT = 0xff8fa8;

/**
 * Бос 3 «Слимак Коля» (специфікація §9.2). Тип 'kolya'.
 * Фаза 1 (100–80%): змійка коридором, ривок раз на p1.lungeEveryMs.
 * 80%: народжує 2 кусак і 2 личинок-стрільців, birth.idleMs стоїть і дихає (вразливий).
 * Фаза 2 (80–40%): ривки частіше, плює.
 * 40%: тремтить split.trembleMs (невразливий) і розпадається на 3 уламки (KolyaPart); малі слимаки зникають.
 *   Сам бос тоді — невидимий «диригент» без тіла: HUD показує суму HP уламків.
 * Лишився один уламок (зокрема двоє загинули в одному кадрі) → бос стає ним: з'їдає рештки eat.ms (невразливий),
 *   HP до eat.healTo, лють. Усі уламки загинули в одному кадрі → бос мертвий.
 * HP не падає нижче порогу події (народження, поділ), поки подія не відбулась.
 */
export default class KolyaBoss extends KolyaBody {
  constructor(scene) {
    const tex = scene.textures.getFrame('kolya');
    super(scene, scene.scale.width / 2, -tex.height, 'kolya', 1, 0);
    this.maxHp = this.hp;
    this.events = { born: false, split: false };
    this.rage = false;
    this.eaten = false;
    this.parts = [];
    this.remains = [];
    this.partsDirty = false;
    this.lungeClock = createLungeClock();
    this.partScale = K.split.scale;
    this.setAct('enter');
  }

  get modeName() {
    if (this.rage) return 'rage';
    return this.events?.born ? 'p2' : 'p1'; // events ще немає, поки працює конструктор KolyaBody
  }

  emitHud() {
    const parts = this.events.split && !this.eaten;
    const hp = parts ? this.parts.filter((p) => p.active).reduce((a, p) => a + Math.max(p.hp, 0), 0) : this.hp;
    this.scene.events.emit('hud:boss', { hp, maxHp: this.maxHp, name: K.name, invulnerable: this.invulnerable });
  }

  takeHit(damage, fx, nowMs) {
    if (!this.active || this.invulnerable) return;
    const allowed = Math.max(this.hp - kolyaHpFloor(this.maxHp, this.events), 0);
    super.takeHit(Math.min(damage, allowed), fx, nowMs);
    if (!this.active) return;
    this.checkPhase();
    this.emitHud();
  }

  checkPhase() {
    if (this.events.split) return;
    const ph = kolyaPhase(this.hp / this.maxHp, this.events);
    if (ph === 'birth') this.startBirth();
    else if (ph === 'split') this.startSplit();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    const now = this.scene.nowMs;
    if (this.act === 'still' && this.stillUntil && now >= this.stillUntil) {
      const next = this.afterStill;
      this.stillUntil = 0;
      this.afterStill = null;
      next?.();
    }
    if (this.partsDirty) {
      this.partsDirty = false;
      const alive = this.parts.filter((p) => p.active);
      const what = afterPartDeath(alive.length, this.eaten);
      if (what === 'eat') this.startEat(alive[0]);
      else if (what === 'dead') this.dieFromParts();
      else this.emitHud();
    }
  }

  /** Стати на ms і потім викликати next. */
  hold(ms, next) {
    this.halt(this.scene.nowMs);
    this.stillUntil = this.scene.nowMs + ms;
    this.afterStill = next;
  }

  // ---------- 80%: народження ----------

  startBirth() {
    const scene = this.scene;
    this.events.born = true;
    sfx('squelch');
    scene.events.emit('hud:banner', { text: 'Коля народжує!', ms: 1300 });
    this.play(animKey('kolya', 'breathe'), true);
    const B = K.birth;
    const kinds = [...Array(B.biters).fill('biter'), ...Array(B.spitters).fill('spitter')];
    kinds.forEach((kind, i) => {
      const dx = (i - (kinds.length - 1) / 2) * 60;
      scene.spawnEnemy(new Slug(scene, this.x + dx, this.y + 20, kind));
    });
    this.hold(B.idleMs, () => this.resume());
  }

  resume() {
    this.play(animKey('kolya', 'crawl'), true);
    this.nextLungeAt = this.scene.nowMs + this.mode.lungeEveryMs;
    this.nextSpitAt = this.scene.nowMs + (this.mode.spitEveryMs || Infinity);
    this.setAct('crawl');
  }

  // ---------- 40%: поділ ----------

  startSplit() {
    const scene = this.scene;
    this.events.split = true;
    this.invulnerable = true;
    this.emitHud();
    sfx('squelch');
    scene.events.emit('hud:banner', { text: 'Коля ділиться!', ms: 1300 });
    // малі слимаки, що лишилися з 80%, зникають — інакше екран засипає
    for (const e of scene.enemies.getChildren().slice()) {
      if (e.kolyaMinion) scene.fadeOut(e, scene.enemies);
    }
    this.shake = scene.tweens.add({ targets: this, x: this.x + 6, duration: 50, yoyo: true, repeat: -1 });
    this.hold(K.split.trembleMs, () => this.splitNow());
  }

  splitNow() {
    const scene = this.scene;
    this.shake?.stop();
    this.shake = null;
    const hps = splitHp(this.hp);
    this.parts = hps.map((hp, i) => {
      const part = new KolyaPart(scene, this, this.x + (i - 1) * 80, this.y + (i === 1 ? -40 : 20), hp, i * 2.1);
      scene.spawnEnemy(part);
      return part;
    });
    // сам бос — «диригент» без тіла: не б'є, не б'ється, не видно
    this.setVisible(false);
    this.harmless = true;
    this.body.enable = false;
    this.setAct('still');
    this.emitHud();
  }

  /** Уламок загинув чи зник: рішення — у наступному кадрі (могли загинути кілька в одному кадрі). */
  onPartGone(part, at) {
    this.remains.push(at);
    this.partsDirty = true;
  }

  // ---------- лють: з'їдання решток ----------

  startEat(last) {
    const scene = this.scene;
    this.eaten = true;
    const hp = eatHeal(last.hp, this.maxHp);
    const at = { x: last.x, y: last.y };
    last.halt(scene.nowMs); // звільнити чергу ривків
    last.boss = null; // зникнення останнього — не смерть
    last.destroy();
    this.setPosition(at.x, at.y).setScale(K.scale * K.split.scale).setVisible(true);
    this.sizeMul = K.split.scale;
    this.body.enable = true;
    this.body.reset(at.x, at.y);
    this.harmless = false;
    this.invulnerable = true;
    this.hp = hp;
    this.moveT = last.moveT;
    this.offset = last.offset;
    sfx('gulp');
    scene.events.emit('hud:banner', { text: 'Коля з\'їдає рештки!', ms: 1300 });
    this.play(animKey('kolya', 'eat'), true);
    // рештки підтягуються до нього, він роздувається
    for (const r of this.remains) {
      const blob = scene.add.image(r.x, r.y, 'slimeSpit').setScale(2.2).setDepth(this.depth - 1);
      scene.tweens.add({ targets: blob, x: at.x, y: at.y, scale: 0.6, duration: K.eat.ms * 0.8, onComplete: () => blob.destroy() });
    }
    scene.tweens.add({ targets: this, scale: K.scale * K.split.scale * 1.18, duration: K.eat.ms, ease: 'Sine.easeIn' });
    this.emitHud();
    this.hold(K.eat.ms, () => this.startRage());
  }

  startRage() {
    this.rage = true;
    this.invulnerable = false;
    this.setBaseTint(RAGE_TINT);
    this.scene.events.emit('boss:rage');
    this.resume();
    this.emitHud();
  }

  /** Усі уламки загинули в одному кадрі: бос мертвий (одна подія 'enemy:killed' з типом 'kolya'). */
  dieFromParts() {
    const last = this.remains[this.remains.length - 1] ?? { x: this.x, y: this.y };
    this.setPosition(last.x, last.y);
    this.invulnerable = false;
    this.eaten = true;
    super.takeHit(this.hp, null, this.scene.nowMs);
  }

  destroy(fromScene) {
    this.shake?.stop();
    for (const p of this.parts) {
      if (p.active) {
        p.boss = null;
        p.destroy(fromScene);
      }
    }
    this.parts = [];
    super.destroy(fromScene);
  }
}

