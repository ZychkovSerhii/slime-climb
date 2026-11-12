import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { endLunge, fanAngles, kolyaBounds, kolyaMode, snakePos, tryLunge } from '../systems/KolyaPlanner.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import SlimeSpit from './SlimeSpit.js';

const K = BALANCE.kolya;
const ARRIVE_PX = 6;
const CRAWL_SPEED = 320; // px/s — щоб наздогнати змійку після ривка без телепорту
const WARN_TINT = 0xffe08a;

/**
 * Спільне тіло Колі та його уламків (§9.2): змійка коридором, ривок у точку гравця з попередженням, плювки слизом.
 * Ривки йдуть по черзі через спільний годинник (KolyaPlanner.tryLunge) — одночасно телеграфує лише одне тіло,
 * тож від кожного ривка рятує стрибок на іншу стіну. Підклас задає modeName і lungeOwner (власник годинника).
 * act: 'enter' | 'crawl' | 'warn' | 'lunge' | 'back' | 'still' (стоїть: народження, тремтіння, з'їдання).
 * Крок часу — scene.nowMs (пауза гри зупиняє все, навіть якщо preUpdate кличеться).
 */
export default class KolyaBody extends Enemy {
  constructor(scene, x, y, type, sizeMul = 1, offset = 0) {
    super(scene, x, y, 'kolya', type);
    this.scrollsWithWorld = false;
    this.sizeMul = sizeMul;
    this.setScale(K.scale * sizeMul);
    this.offset = offset;
    this.moveT = 0;
    this.lastNow = scene.nowMs;
    this.act = 'crawl';
    this.lunging = false;
    this.nextLungeAt = scene.nowMs + this.mode.lungeEveryMs;
    this.nextSpitAt = scene.nowMs + (this.mode.spitEveryMs || Infinity);
    this.setDepth(4);
    this.play(animKey('kolya', 'crawl'));
  }

  /** Хітбокс — тіло без ріжок (у координатах текстури, масштаб застосовує Phaser). */
  spawned() {
    this.body.setSize(84, 30).setOffset(6, 28);
  }

  get halfW() {
    return (this.scene.textures.getFrame('kolya').width * K.scale * this.sizeMul) / 2;
  }

  get mode() {
    return kolyaMode(this.modeName);
  }

  get modeName() {
    return 'p1';
  }

  /** Власник спільного годинника ривків (KolyaBoss). */
  get lungeOwner() {
    return this;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const now = this.scene.nowMs;
    const dt = Math.max(now - this.lastNow, 0);
    this.lastNow = now;
    if (this.body.enable) this.stepBody(now, dt);
  }

  stepBody(now, dt) {
    this.frameDt = dt;
    const scene = this.scene;
    const m = this.mode;
    const mul = this.speedMul(now) * m.speedMul;
    const b = kolyaBounds(scene.scale.width, this.halfW, scene.player.baseY);
    switch (this.act) {
      case 'enter':
        if (this.moveTo(this.x, K.zone.top, CRAWL_SPEED)) this.setAct('crawl');
        break;
      case 'crawl': {
        this.moveT += dt * mul;
        const t = snakePos(this.moveT, b, this.offset);
        this.moveTo(t.x, t.y, CRAWL_SPEED * mul);
        if (now >= this.nextLungeAt) this.startWarn(now);
        if (m.spitEveryMs && now >= this.nextSpitAt) this.spit(now, m);
        break;
      }
      case 'warn':
        this.body.setVelocity(0, 0);
        this.setTint(WARN_TINT); // щокадру: Enemy перераховує відтінок сам
        if (now >= this.warnUntil) {
          this.setAct('lunge');
          this.clearWarnTint();
          this.play(animKey('kolya', 'crawl'));
        }
        break;
      case 'lunge':
        if (this.moveTo(this.lungeTarget.x, this.lungeTarget.y, K.lunge.speed * mul)) this.setAct('back');
        break;
      case 'back': {
        const t = snakePos(this.moveT, b, this.offset);
        if (this.moveTo(t.x, t.y, K.lunge.backSpeed * mul)) {
          this.finishLunge(now);
          this.setAct('crawl');
        }
        break;
      }
      case 'retreat': {
        // перед тим як стати (народження, поділ): назад у свою зону, а не посеред стіни гравця
        const t = snakePos(this.moveT, b, this.offset);
        if (this.moveTo(t.x, t.y, K.lunge.backSpeed * 1.5)) this.setAct('still');
        break;
      }
      default:
        this.body.setVelocity(0, 0);
    }
    if (this.body.velocity.x !== 0) this.setFlipX(this.body.velocity.x < 0);
  }

  setAct(act) {
    this.act = act;
  }

  /** Летить до (x, y) зі швидкістю speed; true — уже там. */
  moveTo(x, y, speed) {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    // поріг — крок цього кадру: інакше на довгому кадрі тіло перелітає ціль і коливається навколо неї
    if (d <= ARRIVE_PX || d <= (speed * (this.frameDt ?? 16)) / 1000) {
      this.setPosition(x, y);
      this.body.setVelocity(0, 0);
      return true;
    }
    this.body.setVelocity((dx / d) * speed, (dy / d) * speed);
    return false;
  }

  /** Попередження перед ривком: стискається warnMs. Ціль — де гравець зараз (від неї рятує стрибок). */
  startWarn(now) {
    const owner = this.lungeOwner;
    const r = tryLunge(owner.lungeClock, now);
    owner.lungeClock = r.clock;
    if (!r.go) return;
    this.lunging = true;
    const p = this.scene.player;
    const b = kolyaBounds(this.scene.scale.width, this.halfW, p.baseY);
    this.lungeTarget = { x: Math.min(Math.max(p.x, b.minX), b.maxX), y: p.y };
    this.warnUntil = now + K.lunge.warnMs;
    this.setAct('warn');
    this.play(animKey('kolya', 'squeeze'));
  }

  clearWarnTint() {
    this.tintedSlow = undefined; // відтінок перерахує Enemy (лють, сповільнення)
    this.clearTint();
  }

  /** Ривок скінчився (або перерваний): звільнити чергу, наступний — через lungeEveryMs. */
  finishLunge(now) {
    if (!this.lunging) return;
    this.lunging = false;
    const owner = this.lungeOwner;
    if (owner?.active || owner === this) owner.lungeClock = endLunge(owner.lungeClock, now);
    this.nextLungeAt = now + this.mode.lungeEveryMs;
  }

  /** Перервати ривок і стати (народження, поділ, з'їдання). Якщо був у ривку — спершу повертається в зону. */
  halt(now) {
    const wasOut = this.act === 'warn' || this.act === 'lunge' || this.act === 'back';
    if (this.act === 'warn') this.clearWarnTint();
    this.finishLunge(now);
    this.setAct(wasOut ? 'retreat' : 'still');
    this.body?.setVelocity(0, 0);
  }

  spit(now, m) {
    const scene = this.scene;
    const p = scene.player;
    this.nextSpitAt = now + m.spitEveryMs;
    const mx = this.x + (this.flipX ? -1 : 1) * this.halfW * 0.7;
    const aim = Phaser.Math.Angle.Between(mx, this.y, p.x, p.y);
    for (const a of fanAngles(aim, m.fan, K.rage.spreadDeg)) {
      const s = new SlimeSpit(scene, mx, this.y);
      scene.enemyProjectiles.add(s);
      s.launch(mx + Math.cos(a) * 100, this.y + Math.sin(a) * 100, K.spit.speed);
    }
    sfx('spit');
  }

  destroy(fromScene) {
    if (this.lunging && this.scene) this.finishLunge(this.scene.nowMs);
    super.destroy(fromScene);
  }
}
