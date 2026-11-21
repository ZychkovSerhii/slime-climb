import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { archerMayFire, dayNight, fleshDrops, fleshEffect, puffBlastDamage, puffShouldFuse, riderSpiderDead, spiderShouldLunge } from '../src/systems/Grass.js';
import { applyDamage, giveTempHeart, tempHeartLeft, tempHeartOn } from '../src/systems/Health.js';

const E = BALANCE.enemies;
const N = BALANCE.grass.night;

describe('біом 5: моби трави', () => {
  test('Волохань стрибає трохи нижче половини екрана', () => {
    expect(spiderShouldLunge(1280 * 0.5, 1280)).toBe(false);
    expect(spiderShouldLunge(1280 * E.hairySpider.lungeYFrac, 1280)).toBe(true);
    expect(E.hairySpider.lungeYFrac).toBeGreaterThan(0.5);
    expect(E.hairySpider.lungeYFrac).toBeLessThan(BALANCE.playerYRatio); // стрибок — згори на гравця
  });

  test('ТЗ: HP і швидкості мобів', () => {
    expect(E.hairySpider).toMatchObject({ hp: 30, speed: 359 });
    expect(E.archer).toMatchObject({ hp: 25, speed: 240, fireMs: 2000 });
    expect(E.rider).toMatchObject({ hp: 60, spiderHp: 30 });
    expect(E.puffball).toMatchObject({ hp: 20, speed: 420, contactDamage: 3 });
    expect(BALANCE.grass.from.rider).toBe(30);
  });

  test('лучник стріляє лише згори — від стріли рятує стрибок', () => {
    expect(archerMayFire(900 - E.archer.minAbovePx, 900)).toBe(true);
    expect(archerMayFire(900 - E.archer.minAbovePx + 1, 900)).toBe(false);
  });

  test('вершник: після 30 шкоди (з 60) павук гине, лучник лишається', () => {
    const maxHp = Math.round(60 * 1.75); // з множником біому HP масштабується разом
    expect(riderSpiderDead(maxHp, maxHp)).toBe(false);
    expect(riderSpiderDead(maxHp / 2 + 1, maxHp)).toBe(false);
    expect(riderSpiderDead(maxHp / 2, maxHp)).toBe(true);
  });

  test('Пшикач: ґніт за fusePx; впритул −3, у радіусі −1, далі 0', () => {
    expect(puffShouldFuse(E.puffball.fusePx)).toBe(true);
    expect(puffShouldFuse(E.puffball.fusePx + 1)).toBe(false);
    expect(puffBlastDamage(10)).toBe(3);
    expect(puffBlastDamage(E.puffball.contactPx + 1)).toBe(1);
    expect(puffBlastDamage(E.puffball.radiusPx + 1)).toBe(0);
    // з іншої стіни (коридор 600 px) вибух не дістає — рятує стрибок
    expect(puffBlastDamage(720 - 2 * BALANCE.wallWidth - BALANCE.playerSize)).toBe(0);
    // за час ґнота він підповзає з fusePx у радіус: стояти на місці — отримати
    expect(E.puffball.fusePx - (E.puffball.creepSpeed * E.puffball.fuseMs) / 1000).toBeLessThan(E.puffball.radiusPx);
    // а стрибок (380 мс) коротший за ґніт
    expect(BALANCE.jumpDurationMs).toBeLessThan(E.puffball.fuseMs);
  });
});

describe('біом 5: день → ніч', () => {
  test('сонце йде зліва направо, потім ніч без світанку', () => {
    expect(dayNight(0)).toEqual({ sunT: 0, dark: 0, moon: false });
    expect(dayNight(N.dayMs / 2).sunT).toBeCloseTo(0.5);
    expect(dayNight(N.dayMs).moon).toBe(true);
    expect(dayNight(N.dayMs + N.fadeMs / 2).dark).toBeCloseTo(N.alpha / 2);
    expect(dayNight(N.dayMs * 10)).toEqual({ sunT: null, dark: N.alpha, moon: true });
  });

  test('ніч не «нічого не видно»: темний шар не густіший за 0,5', () => {
    expect(N.alpha).toBeLessThanOrEqual(0.5);
  });
});

describe('біом 5: гнила плоть і тимчасове серце', () => {
  test('падає з шансом 40%', () => {
    expect(fleshDrops(() => 0.39)).toBe(true);
    expect(fleshDrops(() => 0.4)).toBe(false);
  });

  test('90% — тимчасове серце, 10% — життя; з повними життями не підбирається', () => {
    expect(fleshEffect(() => 0.5, false)).toBe('temp');
    expect(fleshEffect(() => 0.95, false)).toBe('life');
    expect(fleshEffect(() => 0.5, true)).toBe(null);
  });

  test('тимчасове серце знімається першим, а нове лише оновлює таймер', () => {
    const ms = BALANCE.zombie.flesh.tempMs;
    let h = giveTempHeart({ lives: 2, invulnerableUntil: 0 }, 1000, ms);
    expect(tempHeartOn(h, 1000 + ms - 1)).toBe(true);
    expect(tempHeartLeft(h, 1000 + ms / 2, ms)).toBeCloseTo(0.5);
    h = giveTempHeart(h, 5000, ms);
    expect(h.tempUntil).toBe(5000 + ms);
    const r = applyDamage(h, 6000);
    expect(r.health.lives).toBe(2);
    expect(tempHeartOn(r.health, 6001)).toBe(false);
    expect(applyDamage(r.health, 6000 + BALANCE.invulnerableMs).health.lives).toBe(1);
  });

  test('тимчасове серце згасає через 15 с і більше не рятує', () => {
    const h = giveTempHeart({ lives: 2, invulnerableUntil: 0 }, 0, 15000);
    expect(applyDamage(h, 15000).health.lives).toBe(1);
  });

  test('вибух Пшикача знімає 3: з тимчасовим серцем — 2 життя й серце', () => {
    expect(applyDamage({ lives: 3, invulnerableUntil: 0 }, 0, 3)).toMatchObject({ died: true });
    const h = giveTempHeart({ lives: 3, invulnerableUntil: 0 }, 0, 15000);
    expect(applyDamage(h, 100, 3).health.lives).toBe(1);
  });
});
