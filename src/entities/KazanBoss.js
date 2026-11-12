import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { kazanHpFloor, kazanPhase, planPour, pourBusyTo, wallsBusy } from '../systems/KazanPlanner.js';
import { fanAngles } from '../systems/KolyaPlanner.js';
import { otherSide } from '../systems/WallWalkers.js';
import { sfx } from '../systems/Audio.js';
import { animKey, frameOf } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import Bubble from './Bubble.js';
import KazanLid from './KazanLid.js';
import MagmaDrop from './MagmaDrop.js';

const K = BALANCE.kazan;
const ENTER_SPEED = 180;
const LAVA = 0xf06a1e;
const LAVA_HOT = 0xffd25a;
const PUDDLE = 0xa8321a;
const LAVA_W = 44; // ширина струменя вздовж внутрішнього краю стіни (ширша за слизака — «стіна в лаві»)
const LINE_ALPHA = 0.35;
const RAGE_TINT = 0xff9a7a;

/**
 * Бос 4 «Пан Казан» (етап 11, специфікація §11.3). Тип 'kazan'. Висить угорі (y = K.y) і гойдається.
 * Фаза 1 (100–70%): раз на p1.pourEveryMs виливає лаву на стіну гравця (жевріє warnMs, ллється pourMs), плюється магмою.
 * 70%: кипіння (раз) — boil.bubbles бульбашок, boil.idleMs стоїть і вразливий, без атак.
 * Фаза 2 (70–35%): виливання частіше, віяло з 3 крапель, кришка-бумеранг на висоті гравця (лінія lid.warnMs).
 * 35%: лють — rage.shakeMs трясеться (невразливий), далі лава по черзі на обидві стіни з вікном rage.gapMs, віяло з 5.
 * З 2-го кола (+1 атака): після виливання калюжа puddleMs — стіна ще зайнята.
 * Розклад виливань — KazanPlanner.planPour: обидві стіни ніколи не зайняті разом. Лава на стіні б'є слизака,
 * що стоїть на ній (у стрибку — ні). HP не падає нижче порогу події, поки її не відіграно.
 */
export default class KazanBoss extends Enemy {
  constructor(scene) {
    const tex = scene.textures.getFrame('kazan');
    super(scene, scene.scale.width / 2, -tex.height * K.scale, 'kazan', 'kazan');
    this.setScale(K.scale);
    this.scrollsWithWorld = false;
    this.maxHp = this.hp;
    this.events = { boiled: false, raged: false };
    this.pours = [];
    this.last = null;
    this.next = null;
    this.act = 'enter';
    this.actUntil = 0;
    this.lidWarn = null;
    this.fx = scene.add.graphics().setDepth(5);
    this.play(animKey('kazan', 'sway'));
  }

  spawned() {
    this.body.setVelocity(0, 0);
  }

  /** Гойдання задається положенням, а не тілом — для прицілу (Targeting.interceptPoint) віддаємо його швидкість. */
  screenVelocity() {
    if (this.act === 'enter' || this.act === 'shake') return { vx: 0, vy: 0 };
    const w = (2 * Math.PI) / K.swayMs;
    return { vx: K.swayPx * w * 1000 * Math.cos(w * this.scene.nowMs), vy: 0 };
  }

  get modeName() {
    if (this.events.raged) return 'rage';
    return this.events.boiled ? 'p2' : 'p1';
  }

  get mode() {
    return K[this.modeName];
  }

  emitHud() {
    this.scene.events.emit('hud:boss', { hp: this.hp, maxHp: this.maxHp, name: K.name, invulnerable: this.invulnerable });
  }

  takeHit(damage, fx, nowMs) {
    if (!this.active || this.invulnerable) return;
    const allowed = Math.max(this.hp - kazanHpFloor(this.maxHp, this.events), 0);
    super.takeHit(Math.min(damage, allowed), fx, nowMs);
    if (!this.active) return;
    const ph = kazanPhase(this.hp / this.maxHp, this.events);
    if (ph === 'boil') this.startBoil();
    else if (ph === 'rage-start') this.startRage();
    this.emitHud();
  }

  // ---------- 70%: кипіння ----------

  startBoil() {
    const scene = this.scene;
    this.events.boiled = true;
    sfx('gulp');
    scene.events.emit('hud:banner', { text: 'Казан закипає!', ms: 1300 });
    this.play(animKey('kazan', 'boil'), true);
    for (let i = 0; i < K.boil.bubbles; i++) {
      const dx = (i - (K.boil.bubbles - 1) / 2) * 70;
      scene.spawnEnemy(new Bubble(scene, this.x + dx, this.y + 40));
    }
    this.act = 'idle';
    this.actUntil = scene.nowMs + K.boil.idleMs;
  }

  // ---------- 35%: лють ----------

  startRage() {
    const scene = this.scene;
    this.events.raged = true;
    this.invulnerable = true;
    this.cancelLid();
    sfx('roar');
    scene.events.emit('hud:banner', { text: 'Казан у люті!', ms: 1300 });
    scene.events.emit('boss:rage');
    this.play(animKey('kazan', 'shake'), true);
    this.setBaseTint(RAGE_TINT);
    this.act = 'shake';
    this.actUntil = scene.nowMs + K.rage.shakeMs;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    this.body.setVelocity(0, 0);
    if (this.act === 'enter') {
      this.y = Math.min(this.y + (ENTER_SPEED * delta) / 1000, K.y);
      if (this.y >= K.y) this.startFight(now);
      this.draw(now);
      return;
    }
    if (this.act === 'idle' && now >= this.actUntil) {
      this.play(animKey('kazan', 'sway'), true);
      this.startFight(now);
    }
    if (this.act === 'shake' && now >= this.actUntil) {
      this.invulnerable = false;
      this.emitHud();
      this.play(animKey('kazan', 'boil'), true);
      this.startFight(now);
    }
    if (this.act !== 'shake') this.x = scene.scale.width / 2 + K.swayPx * Math.sin((2 * Math.PI * now) / K.swayMs);
    if (this.act === 'fight') this.attack(now);
    this.hurtOnLava(now);
    this.draw(now);
  }

  startFight(now) {
    this.act = 'fight';
    this.nextSpitAt = now + this.mode.spitEveryMs;
    this.nextLidAt = now + (this.mode.lidEveryMs ?? Infinity);
  }

  attack(now) {
    const scene = this.scene;
    // виливання: наступне плануємо за warnMs до найранішого можливого старту — тоді стіна гравця свіжа
    if (!this.next) {
      const every = this.modeName === 'rage' ? 0 : this.mode.pourEveryMs;
      const earliest = this.last ? Math.max(this.last.pourFrom + every, pourBusyTo(this.last) + K.rage.gapMs) : now;
      if (now >= earliest - K.pour.warnMs) {
        this.next = planPour({ phase: this.modeName, last: this.last, nowMs: now, playerSide: scene.player.side, enhanced: this.enhanced });
        this.pours.push(this.next);
      }
    } else if (now >= this.next.pourFrom) {
      this.last = this.next;
      this.next = null;
      this.setFlipX(false);
      this.play(animKey('kazan', this.events.raged ? 'shake' : 'sway'), true);
      sfx('squelch');
    } else if (now >= this.next.warnFrom && !this.next.tilted) {
      // нахиляється до стіни, на яку виллє
      this.next.tilted = true;
      this.stop();
      this.setFrame(frameOf('kazan', 'tilt')).setFlipX(this.next.side === 'right');
    }
    this.pours = this.pours.filter((p) => pourBusyTo(p) > now - 50);
    if (now >= this.nextSpitAt) this.spit(now);
    if (now >= this.nextLidAt && !this.lidWarn) this.warnLid(now);
    if (this.lidWarn && now >= this.lidWarn.at) this.throwLid();
  }

  /** Лава на стіні б'є слизака, що на ній стоїть (у стрибку — ні). */
  hurtOnLava(now) {
    const scene = this.scene;
    const p = scene.player;
    if (scene.dead || p.isJumping) return;
    if (wallsBusy(this.pours, now)[p.side]) scene.hurtPlayer();
  }

  spit(now) {
    const scene = this.scene;
    const p = scene.player;
    const m = this.mode;
    this.nextSpitAt = now + m.spitEveryMs;
    const my = this.y + this.displayHeight * 0.2;
    const aim = Phaser.Math.Angle.Between(this.x, my, p.x, p.y);
    for (const a of fanAngles(aim, m.fan, K.magma.spreadDeg)) {
      const d = new MagmaDrop(scene, this.x, my);
      scene.enemyProjectiles.add(d);
      d.launch(this.x + Math.cos(a) * 100, my + Math.sin(a) * 100, K.magma.speed);
    }
    sfx('spit');
  }

  // ---------- кришка-бумеранг (фаза 2) ----------

  warnLid(now) {
    const p = this.scene.player;
    this.lidWarn = { at: now + K.lid.warnMs, y: p.baseY, from: otherSide(p.side) };
    sfx('whistle');
  }

  throwLid() {
    const scene = this.scene;
    const lid = new KazanLid(scene, this.lidWarn.from, this.lidWarn.y);
    scene.enemyProjectiles.add(lid);
    this.lidWarn = null;
    this.nextLidAt = scene.nowMs + (this.mode.lidEveryMs ?? Infinity);
    sfx('throw');
  }

  cancelLid() {
    this.lidWarn = null;
    this.nextLidAt = Infinity;
  }

  /** Жевріння, струмені лави й калюжі на стінах, лінія кришки. */
  draw(now) {
    const scene = this.scene;
    const g = this.fx;
    const { width, height } = scene.scale;
    const w = BALANCE.wallWidth;
    g.clear();
    for (const p of this.pours) {
      const x = p.side === 'left' ? w : width - w - LAVA_W;
      if (now >= p.warnFrom && now < p.pourFrom) {
        g.fillStyle(LAVA, 0.3 + 0.35 * Math.abs(Math.sin(now / 80)));
        g.fillRect(x, 0, LAVA_W, height);
      } else if (now >= p.pourFrom && now < p.pourTo) {
        const k = Math.min((now - p.pourFrom) / 250, 1); // лава стікає згори
        g.fillStyle(LAVA, 0.95);
        g.fillRect(x, 0, LAVA_W, height * k);
        g.fillStyle(LAVA_HOT, 0.9);
        g.fillRect(x + LAVA_W / 3, 0, LAVA_W / 3, height * k);
      } else if (now >= p.pourTo && now < pourBusyTo(p)) {
        g.fillStyle(PUDDLE, 0.85);
        g.fillRect(x, 0, LAVA_W, height);
        g.fillStyle(LAVA, 0.6);
        for (let y = (now / 4) % 48; y < height; y += 48) g.fillRect(x + 6, y, LAVA_W - 12, 12);
      }
    }
    if (this.lidWarn) {
      g.fillStyle(LAVA_HOT, LINE_ALPHA * (0.6 + 0.4 * Math.abs(Math.sin(now / 90))));
      g.fillRect(w, this.lidWarn.y - 6, width - 2 * w, 12);
    }
  }

  destroy(fromScene) {
    this.fx?.destroy();
    this.fx = null;
    super.destroy(fromScene);
  }
}
