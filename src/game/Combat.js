import { BALANCE } from '../config/balance.js';
import { fireIntervalMul } from '../systems/Status.js';
import {
  attackDamage, axeRadius, spreadBurn, axeTier, boomerangStats, burnStats, chainDamage, chainTargets, createFireState, hasMiniAxe,
  inRadius, lightningStats, shotgunAngles, shotgunRicochet, stepFire,
} from '../systems/Weapons.js';
import { weaponUpgrades } from '../systems/Progression.js';
import { hatStats, hitEffects, playerShotTexture } from '../systems/Skills.js';
import { shotSprite } from '../systems/Meta.js';
import { interceptPoint, pickNearest } from '../systems/Targeting.js';
import { sfx } from '../systems/Audio.js';
import Familiar from '../entities/Familiar.js';
import Projectile from '../entities/Projectile.js';
import WeaponView from '../entities/WeaponView.js';
import ShurikenRing from '../entities/ShurikenRing.js';
import Boomerang from '../entities/Boomerang.js';
import LightningBolt from '../entities/LightningBolt.js';

const VENOM_SHOT_TINT = 0x9cff3a; // постріли з «Ядовитою мордою» — кислотні
// шляпа на голові слизака: центр шляпи відносно центру слизака і зсув другої шляпи
const HAT_Y = -15;
const HAT_STACK = 12;

/**
 * Бій гравця (scene.combat): автоатака основної зброї (постріл, сокира, чакра, дробовик), вигляд зброї,
 * влучання снарядів гравця, шляпи, кільце сюрикенів і міні-сокира-помічниця.
 * Тут живуть fireState, weaponView, hats, ring, miniAxe. Поле weapon лишилось у сцені (його читає LootEffects),
 * а visibleEnemies — делегатом у сцені (кличуть Familiar і LootEffects).
 * Від сцени бере: player, progression, weapon, status, nowMs, paused, currentScroll, групи enemies і
 * playerProjectiles, а також scale, physics, events.
 * Створювати після Player: WeaponView малюється поверх слизака.
 */
export default class Combat {
  constructor(scene) {
    this.scene = scene;
    this.fireState = createFireState();
    this.hats = [];
    this.miniAxe = null;
    this.ring = new ShurikenRing(scene); // фідбек-6 п.8
    this.boomerangs = []; // етап 14
    this.weaponView = new WeaponView(scene, scene.player);
  }

  /** Снаряди гравця б'ють ворогів (викликати в create, де й решта зіткнень). */
  bindHits() {
    const scene = this.scene;
    scene.physics.add.overlap(scene.playerProjectiles, scene.enemies, (proj, enemy) => {
      // крізь невразливого боса снаряди пролітають
      if (scene.paused || !proj.active || !enemy.active || enemy.invulnerable) return;
      enemy.takeHit(proj.damage, proj.fx, scene.nowMs);
      proj.destroy();
      if (enemy.active) sfx('hit');
    });
    // етап 14: вогонь перекидається й вибухає (події з Enemy)
    const onTick = (e) => this.spreadFire(e);
    const onExplode = (e) => this.burnExplode(e);
    scene.events.on('burn:tick', onTick);
    scene.events.on('burn:explode', onExplode);
    scene.events.once('shutdown', () => {
      scene.events.off('burn:tick', onTick);
      scene.events.off('burn:explode', onExplode);
    });
  }

  /** Горить ворог з прокачаним вогнем: на кожному тику підпалює найближчого не палаючого сусіда. */
  spreadFire(e) {
    if (!e.burnFx?.spread) return;
    const A = BALANCE.weaponUpgrades.fire;
    const near = this.visibleEnemies().filter((t) => t !== e && !t.burn);
    const close = inRadius(e, near, A.spreadPx);
    if (!close.length) return;
    pickNearest(e, close).takeHit(0, { burn: spreadBurn(e.burnFx) }, this.scene.nowMs);
  }

  /** Згорілий ворог вибухає: шкода всім довкола (без нового підпалу — щоб вибухи не йшли ланцюгом без кінця). */
  burnExplode({ x, y, dps }) {
    const scene = this.scene;
    const A = BALANCE.weaponUpgrades.fire;
    const g = scene.add.graphics().setDepth(30);
    g.fillStyle(0xf06a1e, 0.4).fillCircle(x, y, A.explodePx).lineStyle(4, 0xffd25a, 0.9).strokeCircle(x, y, A.explodePx);
    scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    sfx('boom');
    for (const t of inRadius({ x, y }, this.visibleEnemies(), A.explodePx)) t.takeHit(dps * A.explodeMul, null, scene.nowMs);
  }

  /** Вороги, видимі на екрані й живі — кандидати в цілі. */
  visibleEnemies() {
    return this.scene.enemies.getChildren().filter((e) => e.active && e.hp > 0 && !e.invulnerable && e.isOnScreen());
  }

  /** Основна зброя змінилась: вигляд, звук, плашка. */
  onMainWeapon(main) {
    this.weaponView.setMain(main);
    this.fireState = createFireState();
    sfx('weaponReady');
    this.scene.events.emit('hud:banner', { text: `Нова зброя:\n${BALANCE.weapons[main].name}`, ms: 1800 });
  }

  /** Етап 14: перемкнули слот — вигляд зброї, коротка затримка пострілу (перемиканням не скинути перезарядку). */
  onSwitch(main, delayMs) {
    this.weaponView.setMain(main);
    this.fireState = { ...createFireState(), cooldownMs: Math.max(this.fireState.cooldownMs, delayMs) };
    sfx('reverse');
    this.scene.floatText(main ? BALANCE.weapons[main].name : 'Стандартна атака', '#ffd84a');
  }

  /** Прокачка основної зброї: банер; на miniAxeAt у сокири — міні-сокира-помічниця. */
  onWeaponUpgrade(weaponId) {
    const scene = this.scene;
    const n = weaponUpgrades(scene.progression, weaponId);
    sfx('weaponReady');
    scene.events.emit('hud:banner', { text: `${BALANCE.weapons[weaponId].name}\n+${n}`, ms: 1200 });
    if (weaponId === 'axe') this.weaponView.setTier(axeTier(n));
    if (hasMiniAxe(weaponId, n) && !this.miniAxe) {
      const M = BALANCE.weaponUpgrades.axe.miniAxe;
      this.miniAxe = new Familiar(scene, {
        texture: 'axe',
        offset: { x: 34, y: -6 },
        speed: M.speed,
        restMs: M.restMs,
        spin: true,
        scale: 0.6,
        damage: () => M.damage,
      });
    }
  }

  /** Атака основної зброї: стартовий постріл, сокира, черга чакри або дробовик (логіка — systems/Weapons.js). */
  autoFire(dt) {
    const scene = this.scene;
    const main = scene.progression.arsenal.main;
    const upgrades = main ? weaponUpgrades(scene.progression, main) : 0;
    const targets = this.visibleEnemies();
    const radius = axeRadius(scene.scale.width, upgrades);
    // сокира б'є лише тих, хто в радіусі; великий бос — краєм тіла
    const size = (t) => Math.min(t.displayWidth, t.displayHeight) / 2;
    const inZone = main === 'axe' ? inRadius(scene.player, targets, radius, size) : null;
    // розмах — коли хтось підійшов ближче (triggerFrac радіуса), а б'є всіх у повному радіусі
    const close = inZone ? inRadius(scene.player, inZone, radius * BALANCE.weapons.axe.triggerFrac, size) : null;
    const r = stepFire(this.fireState, dt, {
      main,
      fireIntervalMs: scene.weapon.fireIntervalMs * fireIntervalMul(scene.status, scene.nowMs),
      upgrades,
      hasTarget: close ? close.length > 0 : targets.length > 0,
    });
    this.fireState = r.state;
    if (!r.fire) return;
    const damage = attackDamage(main, scene.weapon.damage, upgrades);
    if (inZone) {
      this.swingAxe(inZone, damage, radius);
      return;
    }
    const target = pickNearest(scene.player, targets);
    const relics = scene.progression.relics;
    const fx = hitEffects(scene.weapon.slow, relics);
    if (main === 'lightning') {
      this.fireLightning(target, targets, damage, upgrades, fx);
      return;
    }
    const { vx, vy } = target.screenVelocity(scene.currentScroll);
    const aim = interceptPoint(scene.player, { x: target.x, y: target.y, vx, vy }, BALANCE.projectileSpeed);
    const angle = Math.atan2(aim.y - scene.player.y, aim.x - scene.player.x);
    if (main === 'boomerang') {
      this.throwBoomerang(angle, damage, upgrades, fx);
      return;
    }
    const angles = main === 'shotgun' ? shotgunAngles(angle, upgrades) : [angle];
    const fire = main === 'fire';
    const shotFx = fire ? { ...fx, burn: burnStats(damage, upgrades) } : fx;
    // фідбек-7: постріл за скіном; етап 14: вогняна куля — своя
    const texture = fire ? 'fireball' : playerShotTexture(shotSprite(scene.meta), relics);
    const bounceMul = main === 'shotgun' && shotgunRicochet(upgrades) ? BALANCE.weaponUpgrades.shotgun.ricochetMul : null;
    for (const a of angles) {
      const proj = new Projectile(scene, scene.player.x, scene.player.y, texture, { damage, fx: shotFx, bounceMul });
      if (relics.includes('venom') && !fire) proj.setTint(VENOM_SHOT_TINT);
      if (fire) proj.setScale(1.6); // вогняна куля помітніша за грудочку слизу
      scene.playerProjectiles.add(proj);
      proj.launch(scene.player.x + Math.cos(a) * 100, scene.player.y + Math.sin(a) * 100, BALANCE.projectileSpeed, BALANCE.projectileHitboxMul);
    }
    this.weaponView.aim(angle);
    sfx(main === 'shotgun' ? 'shotgun' : fire ? 'fireball' : 'shoot');
  }

  /** Етап 14: розряд у ціль і перескоки по ланцюгу; з прокачкою — застигання й вибух у кінці. */
  fireLightning(target, targets, damage, upgrades, fx) {
    const scene = this.scene;
    const st = lightningStats(upgrades);
    const A = BALANCE.weaponUpgrades.lightning;
    const chain = chainTargets(target, targets, st.targets);
    const hitFx = st.stun ? { ...fx, root: { ms: Math.max(A.stunMs, fx.root?.ms ?? 0), bossMs: fx.root?.bossMs ?? 0 } } : fx;
    const points = [{ x: scene.player.x, y: scene.player.y }, ...chain.map((t) => ({ x: t.x, y: t.y }))];
    chain.forEach((t, i) => t.takeHit(chainDamage(damage, i), hitFx, scene.nowMs));
    const end = points[points.length - 1];
    if (st.blast) {
      for (const t of inRadius(end, this.visibleEnemies(), A.blastPx)) t.takeHit(damage * A.blastMul, null, scene.nowMs);
    }
    new LightningBolt(scene, points, st.blast ? A.blastPx : 0);
    this.weaponView.aim(Math.atan2(target.y - scene.player.y, target.x - scene.player.x));
    sfx('zap');
  }

  /** Етап 14: бумеранг (з twinAt — два під ±twinDeg). */
  throwBoomerang(angle, damage, upgrades, fx) {
    const st = boomerangStats(upgrades);
    const d = (BALANCE.weaponUpgrades.boomerang.twinDeg * Math.PI) / 180;
    const angles = st.count > 1 ? [angle - d, angle + d] : [angle];
    for (const a of angles) this.boomerangs.push(new Boomerang(this.scene, { angle: a, rangePx: st.rangePx, damage, fx, shield: st.shield }));
    sfx('whoosh');
  }

  /** Розмах сокири: шкода всім у радіусі (зокрема босу), без снарядів. */
  swingAxe(targets, damage, radius) {
    const scene = this.scene;
    this.weaponView.swing(radius);
    sfx('axe');
    let hitAlive = false;
    for (const t of targets) {
      if (!t.active || t.invulnerable) continue;
      t.takeHit(damage, hitEffects(scene.weapon.slow, scene.progression.relics), scene.nowMs);
      if (t.active) hitAlive = true;
    }
    if (hitAlive) sfx('hit');
  }

  /** Скіл-картка взята: шляпи або сюрикени. */
  onSkill(id) {
    if (id === 'hat') this.syncHats();
    if (id === 'shuriken') this.ring.sync();
  }

  /** Щокадру: шляпи й кільце сюрикенів. */
  stepHelpers(dt) {
    for (const f of this.hats) f.step(dt);
    this.ring.step();
    if (this.boomerangs.length) {
      const targets = this.visibleEnemies();
      this.boomerangs = this.boomerangs.filter((b) => b.step(dt, targets));
    }
  }

  /** Шляпи на голові: кількість і шкода — за взяттями картки. */
  syncHats() {
    const scene = this.scene;
    const st = hatStats(scene.progression.picks.hat ?? 0);
    const H = BALANCE.skills.hat;
    while (this.hats.length < st.count) {
      const i = this.hats.length;
      this.hats.push(
        new Familiar(scene, {
          texture: 'hat',
          offset: { x: 0, y: HAT_Y - i * HAT_STACK }, // друга — на першій
          speed: H.speed,
          restMs: H.restMs,
          spin: true,
          damage: () => hatStats(scene.progression.picks.hat ?? 0).damage,
        }),
      );
    }
  }
}
