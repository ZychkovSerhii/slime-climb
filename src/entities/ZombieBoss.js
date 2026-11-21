import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { bossHp } from '../systems/Cycle.js';
import { henDodgeX, strikeEveryMs, strikeHits, strikeZone, summonWave, swaySpeed, zombieHpFloor, zombiePhase } from '../systems/ZombiePlanner.js';
import { sfx } from '../systems/Audio.js';
import { animKey, frameOf } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import ZombieMini from './ZombieMini.js';

const Z = BALANCE.zombie;
const ENTER_SPEED = 320;
const SHADOW = 0x000000;
const WARN = 0xffe27a; // рамка попередження — як стрілка ведмедя
const HAND = 0x93a88a;
const HAND_DARK = 0x5a7058;
const RAGE_TINT = 0xffb0a0;
const MOUNT_LIFT = 140; // на курці мрець вище — курка під ним, а не на висоті гравця

/**
 * Бос 5 «Мрець-Велетень» (біом 5; дизайн — docs/superpowers/specs/2026-11-21-grass-biome-design.md). Тип 'zombie'.
 * Спускається згори по центру й тримається так, що низ тулуба (хітбокс — лише тулуб bodyW×bodyH) на hoverAbovePx
 * вище за гравця; гойдається вбік на swaySpeed. Раз на strike.everyMs — удар рукою: на стіні гравця тінь warnMs
 * (смуга strikeZone), потім hitMs удар — рятує стрибок на іншу стіну.
 * 65%: стогне й кличе summon.count малих мерців хвилями. 40%: сідає на курку (hen.hp, свій HP з множниками боса):
 * поки сидить — шкоду бере курка, вона гойдає його на hen.speed і ухиляється від куль (henDodgeX). Курка гине —
 * лють: швидкість ×after.speedMul, удари частіше. HP не падає нижче порогу фази, поки подію не відіграно.
 * З 2-го кола (+1 атака): за кожним ударом — ще один, по стіні, де гравець буде через 1 с.
 */
export default class ZombieBoss extends Enemy {
  constructor(scene) {
    const tex = scene.textures.getFrame('zombie');
    super(scene, scene.scale.width / 2, -tex.height * Z.scale, 'zombie', 'zombie');
    this.setScale(Z.scale);
    this.scrollsWithWorld = false;
    this.maxHp = this.hp;
    this.events = { summoned: false, mounted: false, henDead: false };
    this.henMax = bossHp(Z.hen.hp, scene.loop ?? 0, 'zombie');
    this.henHp = this.henMax;
    this.act = 'enter';
    this.dir = 1;
    this.strike = null;
    this.lastDodgeAt = -Infinity;
    this.timers = [];
    this.fx = scene.add.graphics().setDepth(5);
    this.hen = null;
    this.play(animKey('zombie', 'walk'));
  }

  spawned() {
    // хітбокс — лише голова й тулуб (у пікселях полотна, ×scale)
    const w = Z.bodyW / Z.scale;
    const h = Z.bodyH / Z.scale;
    this.body.setSize(w, h, false).setOffset((this.width - w) / 2, 20);
    this.body.setVelocity(0, 0);
  }

  /** Де стоїть центр спрайта: низ тулуба на hoverAbovePx вище за гравця (на курці — ще вище). */
  get hoverY() {
    const p = this.scene.player;
    const bodyBottomFromCenter = 20 * Z.scale + Z.bodyH - this.displayHeight / 2;
    return (p.baseY ?? p.y) - Z.hoverAbovePx - bodyBottomFromCenter - (this.events.mounted && !this.events.henDead ? MOUNT_LIFT : 0);
  }

  get swayRange() {
    const cx = this.scene.scale.width / 2;
    const r = this.events.mounted && !this.events.henDead ? Z.hen.swayPx : Z.swayPx;
    return { min: cx - r, max: cx + r };
  }

  /** Рух — положенням, не тілом: для автоприцілу віддаємо швидкість гойдання. */
  screenVelocity() {
    if (this.act !== 'fight') return { vx: 0, vy: 0 };
    return { vx: this.dir * swaySpeed(this.events) * this.speedMul(this.scene.nowMs), vy: 0 };
  }

  get riding() {
    return this.events.mounted && !this.events.henDead;
  }

  emitHud() {
    const riding = this.riding;
    this.scene.events.emit('hud:boss', {
      hp: riding ? this.henHp : this.hp, maxHp: riding ? this.henMax : this.maxHp,
      name: riding ? `Курка (${Z.name})` : Z.name, invulnerable: this.invulnerable,
    });
  }

  takeHit(damage, fx, nowMs) {
    if (!this.active || this.invulnerable) return;
    if (this.riding) {
      // поки сидить на курці — шкоду бере курка (ефекти — на мерця: тикають сюди ж)
      super.takeHit(0, fx, nowMs);
      this.henHp -= damage;
      if (this.henHp <= 0) this.henDies();
      this.emitHud();
      return;
    }
    const allowed = Math.max(this.hp - zombieHpFloor(this.maxHp, this.events), 0);
    super.takeHit(Math.min(damage, allowed), fx, nowMs);
    if (!this.active) return;
    const ph = zombiePhase(this.hp / this.maxHp, this.events);
    if (ph === 'summon') this.summon();
    else if (ph === 'hen') this.mount();
    this.emitHud();
  }

  // ---------- 65%: малі мерці ----------

  summon() {
    const scene = this.scene;
    this.events.summoned = true;
    sfx('groan');
    scene.events.emit('hud:banner', { text: 'Мрець кличе своїх!', ms: 1300 });
    const { width } = scene.scale;
    const m = BALANCE.wallWidth + 40;
    for (let i = 0; ; i++) {
      const w = summonWave(i);
      this.timers.push(scene.time.delayedCall(i * Z.summon.gapMs, () => {
        if (!this.active || scene.dead) return;
        for (let k = 0; k < w.n; k++) scene.spawnEnemy(new ZombieMini(scene, Phaser.Math.FloatBetween(m, width - m)));
      }));
      if (w.last) break;
    }
  }

  // ---------- 40%: курка ----------

  mount() {
    const scene = this.scene;
    this.events.mounted = true;
    sfx('cluck');
    sfx('groan');
    scene.events.emit('hud:banner', { text: 'Мрець сідає на курку!', ms: 1300 });
    // курка ПОПЕРЕДУ ніг мерця (він сидить верхи): інакше її майже не видно за ним
    this.hen = scene.add.sprite(this.x, this.y, 'hen').setScale(Z.scale).setDepth(this.depth + 0.1);
    this.hen.play(animKey('hen', 'run'));
  }

  henDies() {
    const scene = this.scene;
    this.events.henDead = true;
    this.henHp = 0;
    sfx('cluck');
    sfx('roar');
    scene.events.emit('hud:banner', { text: 'Курку збито! Мрець лютує', ms: 1300 });
    scene.events.emit('boss:rage');
    this.setBaseTint(RAGE_TINT);
    const hen = this.hen;
    this.hen = null;
    if (hen) scene.tweens.add({ targets: hen, y: hen.y + 400, alpha: 0, angle: 90, duration: 700, onComplete: () => hen.destroy() });
    this.nextStrikeAt = Math.min(this.nextStrikeAt, scene.nowMs + strikeEveryMs(this.events));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    this.body.setVelocity(0, 0);
    const ty = this.hoverY;
    if (this.act === 'enter') {
      this.y = Math.min(this.y + (ENTER_SPEED * delta) / 1000, ty);
      if (this.y >= ty) {
        this.act = 'fight';
        this.nextStrikeAt = now + Z.strike.everyMs / 2;
      }
    } else {
      // до висоти «над гравцем» (на курці — вище) — плавно
      this.y += Phaser.Math.Clamp(ty - this.y, -(ENTER_SPEED * delta) / 1000, (ENTER_SPEED * delta) / 1000);
      this.sway(delta);
      if (this.riding) this.dodge(now);
      this.attack(now);
    }
    if (this.hen) this.hen.setPosition(this.x, this.y + this.displayHeight * 0.32).setFlipX(this.dir < 0).setTint(this.tintTopLeft);
    this.draw(now);
  }

  sway(delta) {
    const r = this.swayRange;
    this.x += (this.dir * swaySpeed(this.events) * this.speedMul(this.scene.nowMs) * delta) / 1000;
    if (this.x >= r.max) {
      this.x = r.max;
      this.dir = -1;
    } else if (this.x <= r.min) {
      this.x = r.min;
      this.dir = 1;
    }
  }

  dodge(now) {
    const r = this.swayRange;
    const shots = this.scene.playerProjectiles.getChildren().filter((s) => s.active).map((s) => ({ x: s.x, y: s.y }));
    const x = henDodgeX({ x: this.x, y: this.y, nowMs: now, lastDodgeAt: this.lastDodgeAt, shots, minX: r.min, maxX: r.max });
    if (x === null) return;
    this.lastDodgeAt = now;
    this.dir = x > this.x ? 1 : -1;
    this.x = x;
    sfx('cluck');
  }

  // ---------- удар рукою ----------

  attack(now) {
    const scene = this.scene;
    const p = scene.player;
    if (!this.strike && now >= this.nextStrikeAt) {
      this.planStrike(now, p.side);
      if (this.enhanced) this.followUp = now + Z.strike.warnMs + Z.strike.hitMs + 1000;
    }
    if (this.followUp && !this.strike && now >= this.followUp) {
      this.followUp = 0;
      this.planStrike(now, p.side);
    }
    const s = this.strike;
    if (!s) return;
    if (now >= s.hitAt && !s.slammed) {
      s.slammed = true;
      sfx('slam');
      scene.cameras.main.shake(140, 0.004);
    }
    if (s.slammed && now < s.hitAt + Z.strike.hitMs && !scene.dead && strikeHits(s.zone, p.x, p.y)) scene.hurtPlayer();
    if (now >= s.hitAt + Z.strike.hitMs) {
      this.strike = null;
      this.setFrame(frameOf('zombie', 'walk1'));
      this.play(animKey('zombie', 'walk'), true);
    }
  }

  /** Тінь на стіні гравця (side — стіна в момент замаху; перестрибнув — удар мимо). */
  planStrike(now, side) {
    const scene = this.scene;
    const zone = strikeZone(side, scene.player.baseY ?? scene.player.y, scene.scale.width);
    this.strike = { zone, hitAt: now + Z.strike.warnMs, slammed: false };
    this.nextStrikeAt = now + strikeEveryMs(this.events);
    this.stop();
    this.setFrame(frameOf('zombie', 'raise'));
  }

  draw(now) {
    const g = this.fx;
    g.clear();
    const s = this.strike;
    if (!s) return;
    const z = s.zone;
    if (!s.slammed) {
      // тінь руки + яскрава рамка: на темному фоні трави сама тінь губилась (скриншот)
      const pulse = Math.abs(Math.sin(now / 70));
      g.fillStyle(SHADOW, 0.45 + 0.25 * pulse);
      g.fillRect(z.x, z.y, z.w, z.h);
      g.lineStyle(6, WARN, 0.5 + 0.5 * pulse).strokeRect(z.x + 3, z.y + 3, z.w - 6, z.h - 6);
      return;
    }
    // долоня: широка «пляма» з пальцями від центру коридору до стіни
    const k = Math.min(0.3 + (now - s.hitAt) / 80, 1);
    const w = z.w * k;
    const x = z.side === 'left' ? z.x + z.w - w : z.x;
    g.fillStyle(HAND, 0.9).fillRect(x, z.y + 40, w, z.h - 80);
    g.fillStyle(HAND_DARK, 0.9);
    for (let i = 0; i < 4; i++) g.fillRect(x, z.y + 60 + i * ((z.h - 120) / 3) - 10, w, 20);
  }

  destroy(fromScene) {
    for (const t of this.timers) t.remove(false);
    this.timers = [];
    this.fx?.destroy();
    this.fx = null;
    this.hen?.destroy();
    this.hen = null;
    super.destroy(fromScene);
  }
}
