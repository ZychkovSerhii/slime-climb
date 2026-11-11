import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  createGiftState, createSantaState, giftDue, giftX, penguinGroup, penguinHp, roarReaches, santaDue, wrapAxis, xpToLevelUp,
} from '../src/systems/Biome.js';
import { createSpawnState, dueSpawns } from '../src/systems/Spawner.js';
import { spawnIntervalMs } from '../src/systems/Difficulty.js';
import { createStatus, fireIntervalMul, isRoared, playerSpeedMul, poison, roar } from '../src/systems/Status.js';

describe('wrapAxis', () => {
  test('на екрані — без змін', () => expect(wrapAxis(500, 0, 1280, 100, 2)).toEqual({ pos: 500, wrapsLeft: 2, wrapped: false, gone: false }));
  test('вилетів униз — з’являється згори, за краєм', () => {
    expect(wrapAxis(1400, 0, 1280, 100, 2)).toEqual({ pos: -100, wrapsLeft: 1, wrapped: true, gone: false });
  });
  test('вилетів угору — з’являється знизу', () => expect(wrapAxis(-150, 0, 1280, 100, 1).pos).toBe(1380));
  test('не більше wraps переходів, далі зникає', () => expect(wrapAxis(1400, 0, 1280, 100, 0).gone).toBe(true));
  test('після переходу ворог не вилітає знову одразу (рівно на межі запасу)', () => {
    const r = wrapAxis(1400, 0, 1280, 100, 2);
    expect(wrapAxis(r.pos, 0, 1280, 100, r.wrapsLeft).wrapped).toBe(false);
  });
});

describe('спавн зими', () => {
  test('у зимі інші вороги, перші появи — від початку зими', () => {
    const s = createSpawnState('winter', 130);
    expect(s.nextAt).toEqual({ elf: 133, bat: 138, penguin: 142, bear: 152 });
    expect(s.biome).toBe('winter');
  });
  test('немає левів і квіток', () => {
    let s = createSpawnState('winter', 0);
    const seen = new Set();
    for (let t = 0; t < 200; t += 0.5) {
      const r = dueSpawns(s, t, false);
      s = r.state;
      r.spawn.forEach((x) => seen.add(x));
    }
    expect([...seen].sort()).toEqual(['bat', 'bear', 'elf', 'penguin']);
  });
  test('інтервали зими беруться з winter.spawnBaseMs', () => {
    expect(spawnIntervalMs('bear', 0, 'winter')).toBe(BALANCE.winter.spawnBaseMs.bear);
    expect(spawnIntervalMs('bat', 0, 'winter')).toBe(BALANCE.winter.spawnBaseMs.bat);
    expect(spawnIntervalMs('bat', 0)).toBe(BALANCE.spawnBaseMs.bat);
  });
  test('придушений спавн (бос) зимою теж нічого не дає', () => {
    expect(dueSpawns(createSpawnState('winter', 0), 100, true).spawn).toEqual([]);
  });
});

describe('Санта', () => {
  test('перевірка раз на хвилину зими з шансом chancePerMin', () => {
    let s = createSantaState(100);
    expect(santaDue(s, 159, () => 0).spawn).toBe(false);
    const r = santaDue(s, 160, () => BALANCE.enemies.santa.chancePerMin - 0.01);
    expect(r.spawn).toBe(true);
    expect(r.state.nextCheckAt).toBe(220);
    expect(santaDue(s, 160, () => BALANCE.enemies.santa.chancePerMin).spawn).toBe(false);
  });
  test('біля боса Санти немає, але хвилина «згоряє»', () => {
    const r = santaDue(createSantaState(0), 60, () => 0, true);
    expect(r.spawn).toBe(false);
    expect(r.state.nextCheckAt).toBe(120);
  });
  test('Санта дає рівень: досвід рівно до наступного рівня', () => {
    expect(xpToLevelUp(3, 14)).toBe(11);
    expect(xpToLevelUp(20, 14)).toBe(0);
  });
});

describe('подарунки', () => {
  const G = BALANCE.winter.gift;
  test('перший через firstMs, далі everyMs ± jitter', () => {
    const s = createGiftState(1000);
    expect(giftDue(s, 1000 + G.firstMs - 1, () => 0.5).spawn).toBe(false);
    const r = giftDue(s, 1000 + G.firstMs, () => 0.5);
    expect(r.spawn).toBe(true);
    expect(r.state.nextAt).toBeCloseTo(1000 + G.firstMs + G.everyMs);
    expect(giftDue(s, 1000 + G.firstMs, () => 0).state.nextAt).toBeCloseTo(1000 + G.firstMs + G.everyMs * (1 - G.jitter));
  });
  test('x — у середніх 60% коридору (там іде стрибок)', () => {
    expect(giftX(() => 0, 60, 660)).toBeCloseTo(180);
    expect(giftX(() => 1, 60, 660)).toBeCloseTo(540);
  });
});

describe('пінгвіни', () => {
  test('HP 3–4', () => {
    expect(penguinHp(() => 0)).toBe(3);
    expect(penguinHp(() => 0.99)).toBe(4);
  });
  test('група 1–3', () => {
    expect(penguinGroup(() => 0)).toBe(1);
    expect(penguinGroup(() => 0.99)).toBe(3);
  });
});

describe('ричання ведмедя', () => {
  const R = BALANCE.enemies.bear.roar;
  test('досягає лише в радіусі', () => {
    expect(roarReaches({ x: 0, y: 0 }, { x: 0, y: 299 })).toBe(true);
    expect(roarReaches({ x: 0, y: 0 }, { x: 250, y: 250 })).toBe(false);
  });
  test('стрибок ×speedMul і стрільба ×fireMul на durationMs', () => {
    const s = roar(createStatus(), 1000);
    expect(isRoared(s, 1000 + R.durationMs - 1)).toBe(true);
    expect(isRoared(s, 1000 + R.durationMs)).toBe(false);
    expect(playerSpeedMul(s, 1001)).toBeCloseTo(R.speedMul);
    expect(fireIntervalMul(s, 1001)).toBeCloseTo(1 / R.fireMul);
    expect(fireIntervalMul(s, 1000 + R.durationMs)).toBe(1);
  });
  test('з отрутою множники перемножуються', () => {
    const s = poison(roar(createStatus(), 0), 0);
    expect(playerSpeedMul(s, 10)).toBeCloseTo(R.speedMul * BALANCE.boss.poison.speedMul);
  });
  test('ричання коротше за паузу між ричаннями — є вікно без сповільнення', () => {
    expect(R.durationMs).toBeLessThan(BALANCE.enemies.bear.rearEveryMs);
    expect(R.speedMul).toBeGreaterThanOrEqual(0.5);
  });
});
