import { BALANCE } from '../config/balance.js';
import {
  afterTrainHp, bombTargets, candyAngles, createRush, danceBounds, danceCfg, danceTarget, peekDamage, phaseFor,
  rushDueCount, rushHeal, rushOver,
} from '../systems/ShkodkoPlanner.js';
import { giftX } from '../systems/Biome.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import GiftBomb from './GiftBomb.js';
import Gift from './Gift.js';
import Candy from './Candy.js';
import Train from './Train.js';

const S = BALANCE.shkodko;
const RAGE_TINT = 0xff9a9a;
const ARRIVE_PX = 6;
const PEEK_DY = -40; // Шкодько визирає над кабіною паровоза
const SCALE = S.scale; // спрайт 64×64 замалий для боса; хітбокс масштабується разом зі спрайтом

/**
 * Бос 2 «Шкодько» (специфікація §6, рішення §6.2).
 * Фаза 1 (100–80%): танець між точками, кожна 4-та — на гравця.
 * Фаза 2 (80–50%): швидше, кожна 2-га — на гравця, на зупинках бомби; раз на volley.everyMs — угору по центру, невразливий, залп.
 * Фаза 3 (50–30%): подарунковий дощ (невразливий, сміється), далі як фаза 2 + град цукерок.
 * Фаза 4 (30%): сідає в потяг (невразливий), визирає з паровоза (шкода не нижче 15%). Вагони розбиті → оглушений → лють.
 * HP не падає нижче порогу фази, поки її подія (дощ, потяг) не відбулась, — інакше сильна зброя її б проскакувала.
 * Таймери — на scene.nowMs. Подія 'hud:boss' — як у павучихи.
 */
export default class ShkodkoBoss extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('shkodko');
    super(scene, width / 2, -tex.height, 'shkodko', 'shkodko');
    this.setScale(SCALE);
    this.scrollsWithWorld = false;
    this.maxHp = this.hp;
    this.halfW = (tex.width * SCALE) / 2;
    this.phase = 1;
    this.rage = false;
    this.rushDone = false;
    this.trainDone = false;
    this.stopNo = 0;
    this.nextVolleyAt = Infinity;
    this.nextCandyAt = Infinity;
    this.rushGifts = [];
    this.setDepth(4);
    this.setState('enter');
    this.play(animKey('shkodko', 'dance'));
  }

  setState(state, durationMs = 0) {
    this.state = state;
    this.stateUntil = this.scene.nowMs + durationMs;
  }

  emitHud() {
    this.scene.events.emit('hud:boss', { hp: this.hp, maxHp: this.maxHp, name: S.name, invulnerable: this.invulnerable });
  }

  // ---------- шкода і фази ----------

  /** Мінімальне HP, поки подія фази не відбулась (дощ на 50%, потяг на 30%). */
  hpFloor() {
    if (!this.rushDone) return S.phases.p3 * this.maxHp;
    if (!this.trainDone) return S.phases.p4 * this.maxHp;
    return 0;
  }

  takeHit(damage, fx, nowMs) {
    if (!this.active || this.invulnerable) return;
    if (this.state === 'train') {
      // визирає з паровоза: шкода проходить, але не нижче peekFloor
      this.hp = peekDamage(this.hp, this.maxHp, damage);
      this.emitHud();
      return;
    }
    const allowed = Math.max(this.hp - this.hpFloor(), 0);
    super.takeHit(Math.min(damage, allowed), fx, nowMs);
    if (!this.active) return;
    this.checkPhase();
    this.emitHud();
  }

  checkPhase() {
    if (this.rage) return;
    const next = phaseFor(this.hp / this.maxHp, this.phase);
    if (next === this.phase) return;
    this.phase = next;
    const now = this.scene.nowMs;
    if (next >= 2 && this.nextVolleyAt === Infinity) this.nextVolleyAt = now + S.volley.everyMs;
    if (next === 2) {
      sfx('bossPain');
      this.scene.events.emit('hud:banner', { text: 'Шкодько злиться!', ms: 1200 });
    }
    if (next >= 3 && !this.rushDone) this.startRush();
    else if (next >= 4 && !this.trainDone) this.startSit();
  }

  get danceCfg() {
    return danceCfg(this.rage ? 'rage' : this.phase);
  }

  // ---------- кадр ----------

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    const mul = this.speedMul(now);
    const D = this.danceCfg;

    switch (this.state) {
      case 'enter':
        if (this.moveTo(this.x, S.zone.top, D.speed * mul)) this.nextStop();
        break;
      case 'dance':
        if (this.moveTo(this.target.x, this.target.y, D.speed * mul)) {
          this.body.setVelocity(0, 0);
          this.setState('pause', D.pauseMs);
        }
        break;
      case 'pause':
        if (now >= this.stateUntil) {
          if (D.bombs && this.phase >= 2) this.throwBombs(D.bombs);
          if (now >= this.nextVolleyAt) this.setState('toCenter');
          else this.nextStop();
        }
        break;
      case 'toCenter':
        if (this.moveTo(scene.scale.width / 2, S.volley.centerY, D.speed * 1.4)) this.startVolley();
        break;
      case 'volley':
        if (now >= this.stateUntil) this.endInvulnerable(() => this.nextStop());
        break;
      case 'toRush':
        if (this.moveTo(scene.scale.width / 2, S.volley.centerY, D.speed * 1.4)) this.setState('rush');
        break;
      case 'rush':
        this.stepRush(now);
        break;
      case 'sit':
        if (now >= this.stateUntil) this.startTrain();
        break;
      case 'train':
        this.stepTrain(now);
        break;
      case 'stun':
        if (now >= this.stateUntil) this.startRage();
        break;
      default:
        break;
    }
    // град цукерок: фаза 3 після дощу і лють, лише коли він «у бою» (не невразливий)
    if (!this.invulnerable && this.state !== 'stun' && this.state !== 'train' && now >= this.nextCandyAt) {
      this.nextCandyAt = now + S.candy.everyMs / (this.rage ? 1.25 : 1);
      this.throwCandies();
    }
  }

  /** Летить до (x, y) зі швидкістю speed; true — уже там. */
  moveTo(x, y, speed) {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= ARRIVE_PX) {
      this.setPosition(x, y);
      this.body.setVelocity(0, 0);
      return true;
    }
    this.body.setVelocity((dx / d) * speed, (dy / d) * speed);
    return false;
  }

  nextStop() {
    const scene = this.scene;
    this.stopNo += 1;
    const b = danceBounds(scene.scale.width, this.halfW, scene.player.baseY);
    this.target = danceTarget(this.stopNo, this.danceCfg.aimEvery, scene.player, b, Math.random);
    this.setState('dance');
  }

  /** Повертає вразливість і HUD, потім next(). */
  endInvulnerable(next) {
    this.invulnerable = false;
    this.play(animKey('shkodko', 'dance'), true);
    this.emitHud();
    next();
  }

  // ---------- бомби й цукерки ----------

  throwBombs(n) {
    const scene = this.scene;
    const w = BALANCE.wallWidth + 20;
    for (const t of bombTargets(n, scene.player, w, scene.scale.width - w, Math.random)) {
      scene.bombs.add(new GiftBomb(scene, this.x, this.y, t.x, t.y));
    }
    sfx('throw');
  }

  startVolley() {
    this.invulnerable = true;
    this.play(animKey('shkodko', 'laugh'), true);
    sfx('laugh');
    this.throwBombs(S.volley.count);
    this.nextVolleyAt = this.scene.nowMs + S.volley.holdMs + S.volley.everyMs;
    this.setState('volley', S.volley.holdMs);
    this.emitHud();
  }

  throwCandies() {
    const scene = this.scene;
    const p = scene.player;
    const aim = Math.atan2(p.y - this.y, p.x - this.x);
    for (const a of candyAngles(aim)) {
      const c = new Candy(scene, this.x, this.y);
      c.type = 'candy';
      scene.enemyProjectiles.add(c);
      c.launch(this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, S.candy.speed);
    }
  }

  // ---------- фаза 3: подарунковий дощ ----------

  startRush() {
    this.invulnerable = true;
    this.body.setVelocity(0, 0);
    this.play(animKey('shkodko', 'laugh'), true);
    sfx('laugh');
    this.rush = createRush(this.scene.nowMs);
    this.rushFallMs = ((this.scene.scale.height + 80) / S.rush.fallSpeed) * 1000;
    this.setState('toRush');
    this.rushBanner();
    this.emitHud();
  }

  rushBanner() {
    this.scene.events.emit('hud:banner', { text: `Лови подарунки! ${this.rush.collected}/${S.rush.goal}`, ms: 1400 });
  }

  stepRush(now) {
    const scene = this.scene;
    const due = rushDueCount(this.rush, now);
    while (this.rush.spawned < due) {
      this.rush.spawned += 1;
      const w = BALANCE.wallWidth;
      const g = new Gift(scene, giftX(Math.random, w, scene.scale.width - w), -20);
      g.scrollsWithWorld = false;
      g.xp = S.rush.xp;
      g.onCollect = () => {
        this.rush.collected += 1;
        this.rushBanner();
      };
      scene.pickups.add(g);
      g.body.setVelocity(0, S.rush.fallSpeed);
      this.rushGifts.push(g);
    }
    if (rushOver(this.rush, now, this.rushFallMs)) this.endRush();
  }

  endRush() {
    for (const g of this.rushGifts) if (g.active) g.destroy();
    this.rushGifts = [];
    this.rushDone = true;
    const before = this.hp;
    this.hp = rushHeal(this.hp, this.maxHp, this.rush.collected);
    const ok = this.rush.collected >= S.rush.goal;
    this.scene.events.emit('hud:banner', { text: ok ? 'Ціль виконано!' : `Шкодько підлікувався (+${Math.round(((this.hp - before) / this.maxHp) * 100)}%)`, ms: 1500 });
    this.nextCandyAt = this.scene.nowMs + S.candy.everyMs;
    this.phase = Math.max(this.phase, 3);
    this.endInvulnerable(() => this.nextStop());
  }

  // ---------- фаза 4: потяг ----------

  startSit() {
    this.invulnerable = true;
    this.harmless = true; // зникає — дотик не б'є
    this.body.setVelocity(0, 0);
    this.nextCandyAt = Infinity;
    this.play(animKey('shkodko', 'laugh'), true);
    this.scene.events.emit('hud:banner', { text: 'Потяг!', ms: 1200 });
    // «сідає»: зменшується й зникає
    this.scene.tweens.add({ targets: this, scale: SCALE * 0.4, alpha: 0, duration: S.train.sitMs });
    this.setState('sit', S.train.sitMs);
    this.emitHud();
  }

  startTrain() {
    // harmless лишається: б'є паровоз, не він
    this.setScale(1); // з паровоза визирає менший
    this.train = new Train(this.scene, () => this.endTrain());
    this.nextPeekAt = this.scene.nowMs + S.train.peekEveryMs;
    this.peekUntil = 0;
    this.setState('train');
  }

  stepTrain(now) {
    const loco = this.train.update(now);
    this.body.setVelocity(0, 0);
    if (this.state !== 'train') return; // потяг міг скінчитися в update
    if (loco?.active) this.setPosition(loco.x, loco.y + PEEK_DY);
    const visible = loco?.active && loco.visible;
    if (now >= this.nextPeekAt && visible) {
      this.peekUntil = now + S.train.peekMs;
      this.nextPeekAt = now + S.train.peekEveryMs;
    }
    const peeking = visible && now < this.peekUntil;
    if (peeking === this.invulnerable) {
      this.invulnerable = !peeking;
      this.setAlpha(peeking ? 1 : 0);
      this.emitHud();
    }
  }

  endTrain() {
    this.trainDone = true;
    this.train.destroy();
    this.train = null;
    this.harmless = false;
    this.invulnerable = false;
    this.hp = afterTrainHp(this.hp, this.maxHp);
    const { width } = this.scene.scale;
    this.setPosition(width / 2, S.volley.centerY).setAlpha(1).setScale(SCALE);
    this.play(animKey('shkodko', 'stun'), true);
    sfx('bossPain');
    this.scene.events.emit('hud:banner', { text: 'Шкодько оглушений!', ms: 1500 });
    this.setState('stun', S.stunMs);
    this.emitHud();
  }

  startRage() {
    this.rage = true;
    this.setBaseTint(RAGE_TINT);
    this.scene.events.emit('boss:rage');
    this.nextCandyAt = this.scene.nowMs + 600;
    this.endInvulnerable(() => this.nextStop());
  }

  destroy(fromScene) {
    this.train?.destroy();
    for (const g of this.rushGifts) if (g.active) g.destroy();
    super.destroy(fromScene);
  }
}
