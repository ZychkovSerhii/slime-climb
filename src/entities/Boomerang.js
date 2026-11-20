import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { pierceDamage, stepBoomerang } from '../systems/Weapons.js';

const SPIN = 0.03; // рад/мс
const SCALE = 2.2; // на телефоні 1,5 ледве видно (скриншот етапу 14)

/**
 * Бумеранг (етап 14): летить rangePx під кутом angle і назад до слизака, пробиває всіх; кожного ворога б'є
 * раз туди й раз назад. З щитом (прокачка shieldAt), повернувшись, shieldMs крутиться над слизаком і б'є кожного
 * не частіше shieldCdMs. Рух — Weapons.stepBoomerang; цілі дає Combat (visibleEnemies). Їде відносно екрана.
 * step(dt) повертає false, коли бумеранг зник.
 */
export default class Boomerang extends Phaser.GameObjects.Image {
  constructor(scene, { angle, rangePx, damage, fx, shield, owner = scene.player }) {
    const p = owner; // фідбек-8: кидає й ловить той, хто кинув (слизак чи клон «Я КОЛЯ»)
    super(scene, p.x, p.y, 'boomerang');
    scene.add.existing(this);
    this.setDepth(6).setScale(SCALE);
    this.state = { x: p.x, y: p.y, angle, travelled: 0, back: false };
    this.rangePx = rangePx;
    this.damage = damage;
    this.fx = fx;
    this.shield = shield;
    this.owner = owner;
    this.hitOut = new Set();
    this.hitBack = new Set();
    this.shieldUntil = 0;
    this.shieldHit = new Map();
  }

  step(dt, targets) {
    const scene = this.scene;
    const B = BALANCE.weapons.boomerang;
    const A = BALANCE.weaponUpgrades.boomerang;
    const now = scene.nowMs;
    this.rotation += SPIN * dt;
    if (this.shieldUntil) {
      if (now >= this.shieldUntil) return this.gone();
      const a = now / 180;
      this.setPosition(scene.player.x + Math.cos(a) * A.shieldPx, scene.player.y + Math.sin(a) * A.shieldPx);
      for (const t of this.touching(targets)) {
        if (now - (this.shieldHit.get(t) ?? -Infinity) < A.shieldCdMs) continue;
        this.shieldHit.set(t, now);
        t.takeHit(this.damage, this.fx, now);
      }
      return true;
    }
    this.state = stepBoomerang(this.state, dt, B.speed, this.rangePx, this.owner);
    this.setPosition(this.state.x, this.state.y);
    const hit = this.state.back ? this.hitBack : this.hitOut;
    for (const t of this.touching(targets)) {
      if (hit.has(t)) continue;
      t.takeHit(pierceDamage(this.damage, hit.size), this.fx, now); // правка 2026-11-18: перший ×1, решта слабше
      hit.add(t);
    }
    if (this.state.done) {
      if (!this.shield) return this.gone();
      this.shieldUntil = now + A.shieldMs;
    }
    return true;
  }

  touching(targets) {
    const r = BALANCE.weapons.boomerang.hitPx;
    return targets.filter((t) => {
      if (!t.active || t.invulnerable) return false;
      const reach = r + Math.min(t.displayWidth, t.displayHeight) / 2;
      return (t.x - this.x) ** 2 + (t.y - this.y) ** 2 <= reach * reach;
    });
  }

  gone() {
    this.destroy();
    return false;
  }
}
