import { BALANCE } from '../config/balance.js';
import { fireIntervalMul } from '../systems/Status.js';
import { attackDamage, axeRadius, axeTier, createFireState, hasMiniAxe, inRadius, shotgunAngles, stepFire } from '../systems/Weapons.js';
import { weaponUpgrades } from '../systems/Progression.js';
import { hatStats, hitEffects } from '../systems/Skills.js';
import { interceptPoint, pickNearest } from '../systems/Targeting.js';
import { sfx } from '../systems/Audio.js';
import Familiar from '../entities/Familiar.js';
import Projectile from '../entities/Projectile.js';
import WeaponView from '../entities/WeaponView.js';

const VENOM_SHOT_TINT = 0x9cff3a; // постріли з «Ядовитою мордою» — кислотні
// шляпа на голові слизака: центр шляпи відносно центру слизака і зсув другої шляпи
const HAT_Y = -15;
const HAT_STACK = 12;

/**
 * Бій гравця (scene.combat): автоатака основної зброї (постріл, сокира, чакра, дробовик), вигляд зброї,
 * влучання снарядів гравця, шляпи й міні-сокира-помічниця.
 * Тут живуть fireState, weaponView, hats, miniAxe. Поле weapon лишилось у сцені (його читає LootEffects),
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
    const { vx, vy } = target.screenVelocity(scene.currentScroll);
    const aim = interceptPoint(scene.player, { x: target.x, y: target.y, vx, vy }, BALANCE.projectileSpeed);
    const angle = Math.atan2(aim.y - scene.player.y, aim.x - scene.player.x);
    const angles = main === 'shotgun' ? shotgunAngles(angle, upgrades) : [angle];
    const relics = scene.progression.relics;
    const fx = hitEffects(scene.weapon.slow, relics);
    const texture = relics.includes('web') ? 'webShot' : 'projectile';
    for (const a of angles) {
      const proj = new Projectile(scene, scene.player.x, scene.player.y, texture, { damage, fx });
      if (relics.includes('venom')) proj.setTint(VENOM_SHOT_TINT);
      scene.playerProjectiles.add(proj);
      proj.launch(scene.player.x + Math.cos(a) * 100, scene.player.y + Math.sin(a) * 100, BALANCE.projectileSpeed, BALANCE.projectileHitboxMul);
    }
    this.weaponView.aim(angle);
    sfx(main === 'shotgun' ? 'shotgun' : 'shoot');
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
