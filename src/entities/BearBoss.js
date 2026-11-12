import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { bearBatsDue, bearJumps, bearZone, crawlMs, rearDue, reenterSide } from '../systems/BearPlanner.js';
import { otherSide } from '../systems/WallWalkers.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import BearAura from './BearAura.js';

const BB = BALANCE.bearBoss;
const J = BB.jump;
const ARROW_COLOR = 0xffe27a;
const RING_COLOR = 0xcfe8ff;
const BODY_PX = 52; // хітбокс у пікселях полотна (×scale): без прозорих полів спрайта

/**
 * Білий ведмідь — міні-бос зими (етап 10, §10.2). Повзає лише по стінах (спрайт ×3, лапами до стіни).
 * act: 'enter' (згори на свою стіну) → 'crawl' (вгору-вниз по стіні crawlMs) → серія з bearJumps стрибків:
 *   'warn' (присів jump.warnMs, стрілка в точку гравця на момент присідання) → 'jump' (по прямій у цю точку) →
 *   вилетів за край → 'out' (jump.reenterMs, невидимий) → з'являється на протилежній стіні → 'warn'…
 *   Після серії — знову 'crawl': з шансом sameWallChance на стіні гравця (над ним), інакше на протилежній.
 * Раз на rearEveryMs під час повзання — 'rear' (rearWarnMs, коло росте) → ричання: аура з власним HP (BearAura).
 * Поки аура ціла, ведмідь невразливий, але стрибає далі. На batsAt HP — раз 2 зимові летючі миші.
 */
export default class BearBoss extends Enemy {
  constructor(scene) {
    super(scene, 0, 0, 'bear', 'bear');
    this.setScale(BB.scale);
    this.scrollsWithWorld = false;
    this.maxHp = this.hp;
    this.halfLen = (this.width * BB.scale) / 2;
    this.batsDone = false;
    this.aura = null;
    this.fx = scene.add.graphics().setDepth(this.depth + 1);
    this.dir = new Phaser.Math.Vector2(0, 1);
    this.nextRearAt = scene.nowMs + BB.rearFirstMs;
    this.placeOnWall(otherSide(scene.player.side), -this.halfLen);
    this.setAct('enter');
  }

  spawned() {
    this.body.setSize(BODY_PX, BODY_PX, true);
    this.body.setVelocity(0, 0);
  }

  emitHud() {
    this.scene.events.emit('hud:boss', { hp: this.hp, maxHp: this.maxHp, name: BB.name, invulnerable: this.invulnerable });
  }

  setAct(act, ms = 0) {
    this.act = act;
    this.actUntil = this.scene.nowMs + ms;
  }

  wallX(side) {
    const { width } = this.scene.scale;
    return side === 'left' ? BALANCE.wallWidth + this.halfLen : width - BALANCE.wallWidth - this.halfLen;
  }

  /** На стіні side, мордою вгору, лапами до стіни. */
  placeOnWall(side, y) {
    this.side = side;
    this.setPosition(this.wallX(side), y);
    this.setRotation(-Math.PI / 2);
    this.setFlipY(side === 'left');
    this.play(animKey('bear', 'walk'), true);
  }

  get zone() {
    const p = this.scene.player;
    return bearZone(p.baseY ?? p.y, this.act === 'crawl' && this.side === p.side);
  }

  /** Невразливий, поки за екраном або поки ціла аура. */
  syncVulnerable() {
    const was = this.invulnerable;
    this.invulnerable = this.act === 'out' || Boolean(this.aura?.active);
    if (was !== this.invulnerable) this.emitHud();
  }

  takeHit(damage, fx, nowMs) {
    super.takeHit(damage, fx, nowMs);
    if (!this.active) return;
    if (bearBatsDue(this.hp / this.maxHp, this.batsDone)) {
      this.batsDone = true;
      this.scene.spawnBearBats();
    }
    this.emitHud();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const now = this.scene.nowMs;
    const mul = this.speedMul(now);
    const z = this.zone;
    this.fx.clear();
    switch (this.act) {
      case 'enter':
        this.body.setVelocity(0, BB.climbSpeed * 2 * mul);
        if (this.y >= z.minY) this.startCrawl();
        break;
      case 'crawl': {
        if (this.y <= z.minY) this.crawlDir = 1;
        else if (this.y >= z.maxY) this.crawlDir = -1;
        this.body.setVelocity(0, this.crawlDir * BB.climbSpeed * mul);
        this.setFlipX(this.crawlDir > 0); // голова туди, куди повзе
        if (rearDue(now, this.nextRearAt, Boolean(this.aura?.active))) this.startRear(now);
        else if (now >= this.actUntil) this.startSeries();
        break;
      }
      case 'rear':
        this.body.setVelocity(0, 0);
        this.drawRing(1 - Math.max(this.actUntil - now, 0) / BB.rearWarnMs);
        if (now >= this.actUntil) this.roar(now);
        break;
      case 'warn':
        this.body.setVelocity(0, 0);
        this.fx.lineStyle(5, ARROW_COLOR, 0.5 + 0.4 * Math.sin(now / 60)).lineBetween(this.x, this.y, this.target.x, this.target.y);
        this.fx.fillStyle(ARROW_COLOR, 0.6).fillCircle(this.target.x, this.target.y, 14);
        if (now >= this.actUntil) this.jump();
        break;
      case 'jump':
        this.body.setVelocity(this.dir.x * J.speed * mul, this.dir.y * J.speed * mul);
        if (this.isOffscreen()) this.goOut();
        break;
      case 'out':
        this.body.setVelocity(0, 0);
        if (now >= this.actUntil) this.reenter();
        break;
      default:
        break;
    }
    this.syncVulnerable();
  }

  startCrawl() {
    this.crawlDir = 1;
    this.placeOnWall(this.side, this.y);
    this.setAct('crawl', crawlMs(Math.random));
  }

  startSeries() {
    this.jumpsLeft = bearJumps(this.enhanced);
    this.warn();
  }

  /** Присів: попередження і стрілка в точку, де гравець зараз. Ухилитися — стрибнути на іншу стіну. */
  warn() {
    const p = this.scene.player;
    this.target = { x: p.x, y: p.y };
    this.setScale(BB.scale, BB.scale * 0.85);
    this.blink = this.scene.tweens.add({ targets: this, alpha: 0.5, duration: J.warnMs / 4, yoyo: true, repeat: 1 });
    this.setAct('warn', J.warnMs);
  }

  jump() {
    this.blink?.stop();
    this.setAlpha(1).setScale(BB.scale);
    this.dir.set(this.target.x - this.x, this.target.y - this.y).normalize();
    this.setRotation(this.dir.angle());
    this.setFlipX(false);
    this.setFlipY(this.dir.x < 0);
    sfx('bite');
    this.setAct('jump');
  }

  /** Вилетів за край: невидимий і невразливий reenterMs. */
  goOut() {
    this.jumpsLeft -= 1;
    this.exitX = this.x;
    this.setVisible(false);
    this.body.enable = false;
    this.setAct('out', J.reenterMs);
  }

  /** З'являється на протилежній стіні: далі стрибок серії або повзання (на стіні, де гравця немає). */
  reenter() {
    const { width } = this.scene.scale;
    const z = this.zone;
    const more = this.jumpsLeft > 0;
    // після серії — на стіні гравця (над ним, у досяжності сокири) або на протилежній
    const ps = this.scene.player.side;
    const side = more ? reenterSide(this.exitX, width) : Math.random() < BB.sameWallChance ? ps : otherSide(ps);
    this.placeOnWall(side, Phaser.Math.FloatBetween(z.minY, z.maxY));
    this.setVisible(true);
    this.body.enable = true;
    if (more) this.warn();
    else this.startCrawl();
  }

  /** На задні лапи: коло росте rearWarnMs. */
  startRear(now) {
    this.body.setVelocity(0, 0);
    this.play(animKey('bear', 'rear'));
    this.crawlLeft = Math.max(this.actUntil - now, 0);
    this.setAct('rear', BB.rearWarnMs);
  }

  drawRing(k) {
    this.fx.lineStyle(4, RING_COLOR, 0.6).strokeCircle(this.x, this.y, BB.aura.radiusPx * (0.2 + 0.8 * k));
  }

  /** Ричання: аура з власним HP; далі повзання, що лишилось. */
  roar(now) {
    sfx('roar');
    this.nextRearAt = now + BB.rearEveryMs;
    this.aura = this.scene.spawnEnemy(new BearAura(this.scene, this));
    this.play(animKey('bear', 'walk'));
    this.setAct('crawl', this.crawlLeft ?? 0);
    this.emitHud();
  }

  onAuraGone() {
    this.aura = null;
    if (this.active) this.syncVulnerable();
  }

  destroy(fromScene) {
    this.blink?.stop();
    const aura = this.aura;
    this.aura = null;
    if (aura?.active) aura.destroy(fromScene);
    this.fx?.destroy();
    this.fx = null;
    super.destroy(fromScene);
  }
}
