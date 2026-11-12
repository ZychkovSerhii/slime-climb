import { healForLevels } from '../src/systems/Health.js';
import { xpToNext as xpToNext10 } from '../src/systems/Progression.js';
import { BALANCE as B10 } from '../src/config/balance.js';
import { describe, expect, test } from 'vitest';
import {
  CARD_IDS,
  addXp,
  applyCard,
  availableCards,
  createProgression,
  rollCards,
  CORE_CARD_IDS,
  xpToNext,
  WEAPON_IDS,
  cardWeapon,
  rollLevelUp,
  rollWeapon,
  weaponCard,
  weaponProgress,
  upgradeCard,
  weaponUpgrades,
} from '../src/systems/Progression.js';
import { BALANCE } from '../src/config/balance.js';

function seq(...values) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('xpToNext', () => {
  test('curve 10 × 1.22^(level-1), rounded (feedback-3)', () => {
    expect(xpToNext(1)).toBe(10);
    expect(xpToNext(2)).toBe(12);
    expect(xpToNext(3)).toBe(15);
  });
});

describe('addXp', () => {
  test('below threshold → no level', () => {
    const r = addXp(createProgression(), 9);
    expect(r.levelsGained).toBe(0);
    expect(r.progression.xp).toBe(9);
  });

  test('exactly the threshold → level 2 with 0 xp', () => {
    const r = addXp(createProgression(), 10);
    expect(r.levelsGained).toBe(1);
    expect(r.progression.level).toBe(2);
    expect(r.progression.xp).toBe(0);
  });

  test('a big reward carries over several levels (10+12+15+18=55, 5 left)', () => {
    const r = addXp(createProgression(), 60);
    expect(r.levelsGained).toBe(4);
    expect(r.progression.level).toBe(5);
    expect(r.progression.xp).toBe(5);
  });

  test('does not mutate the input', () => {
    const p = createProgression();
    addXp(p, 60);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(0);
  });
});

describe('cards', () => {
  test('fresh weapon matches BALANCE', () => {
    expect(createProgression().weapon).toEqual({ fireIntervalMs: 1000, damage: 1, slow: null });
  });

  test('rollCards returns 3 different ids from the pool', () => {
    const cards = rollCards(createProgression(), seq(0.9, 0.1, 0.5));
    expect(cards).toHaveLength(3);
    expect(new Set(cards).size).toBe(3);
    for (const c of cards) expect(CARD_IDS).toContain(c);
  });

  test('the first regular card is always a core one', () => {
    for (let i = 0; i < 200; i++) {
      const [first] = rollCards(createProgression(), Math.random, 2);
      expect(CORE_CARD_IDS).toContain(first);
    }
  });

  test('attackSpeed is unavailable at minimum interval', () => {
    let p = createProgression();
    p = { ...p, weapon: { ...p.weapon, fireIntervalMs: 250 } };
    expect(availableCards(p)).not.toContain('attackSpeed');
    const cards = rollCards(p, seq(0, 0, 0));
    expect(cards).toHaveLength(3);
    expect(cards).not.toContain('attackSpeed');
  });

  test('attackSpeed: ×0.85, never below minFireIntervalMs', () => {
    const p = applyCard(createProgression(), 'attackSpeed');
    expect(p.weapon.fireIntervalMs).toBe(850);
    const near = { ...p, weapon: { ...p.weapon, fireIntervalMs: 260 } };
    expect(applyCard(near, 'attackSpeed').weapon.fireIntervalMs).toBe(250);
  });

  test('damage: every pick +1 (feedback-2)', () => {
    const p1 = applyCard(createProgression(), 'damage');
    expect(p1.weapon.damage).toBe(2);
    const p2 = applyCard(p1, 'damage');
    expect(p2.weapon.damage).toBe(3);
    expect(applyCard(p2, 'damage').weapon.damage).toBe(4);
  });

  test('ice attack: 40% slow + 0.5 dps for 3 s; each pick +5% slow (max 60%) and +0.5 dps', () => {
    const once = applyCard(createProgression(), 'slow');
    expect(once.weapon.slow).toMatchObject({ factor: 0.6, durationMs: 3000, dps: 0.5, bossFactor: 0.95, ice: true });
    const twice = applyCard(once, 'slow');
    expect(twice.weapon.slow.factor).toBeCloseTo(0.55);
    expect(twice.weapon.slow.dps).toBe(1);
    let p = twice;
    for (let i = 0; i < 6; i++) p = applyCard(p, 'slow');
    expect(p.weapon.slow.factor).toBe(0.4);
    expect(p.weapon.slow.dps).toBe(4);
  });

  test('picks are counted', () => {
    const p = applyCard(applyCard(createProgression(), 'damage'), 'damage');
    expect(p.picks.damage).toBe(2);
  });
});

import { killXp } from '../src/systems/Progression.js';

test('killXp per enemy type and boss', () => {
  expect(killXp('lion')).toBe(5);
  expect(killXp('smallSpider')).toBe(1);
  expect(killXp('boss')).toBe(60);
});

describe('weapon cards (stage 4a)', () => {
  test('level-up window: 2 regular cards + weapon as the 3rd', () => {
    const { cards } = rollLevelUp(createProgression(), seq(0, 0.5, 0.1));
    expect(cards).toHaveLength(3);
    expect(cards.slice(0, 2).every((c) => CARD_IDS.includes(c))).toBe(true);
    expect(WEAPON_IDS).toContain(cardWeapon(cards[2]));
  });

  test('never offers the same weapon as in the previous window', () => {
    let p = createProgression();
    for (let i = 0; i < 40; i++) {
      const prev = p.arsenal.lastOffered;
      const r = rollLevelUp(p, Math.random);
      const w = cardWeapon(r.cards[2]);
      expect(w).not.toBe(prev);
      p = r.progression;
      expect(p.arsenal.lastOffered).toBe(w);
    }
  });

  test('progress is kept, full progress makes the weapon main; replaced by the next full one', () => {
    const steps = (id) => BALANCE.weapons[id].steps;
    let p = createProgression();
    p = applyCard(p, weaponCard('chakra'));
    p = applyCard(p, weaponCard('shotgun'));
    expect(weaponProgress(p, 'chakra')).toBe(1);
    expect(p.arsenal.main).toBeNull();
    for (let i = 1; i < steps('chakra'); i++) p = applyCard(p, weaponCard('chakra'));
    expect(p.arsenal.main).toBe('chakra');
    for (let i = 1; i < steps('shotgun'); i++) p = applyCard(p, weaponCard('shotgun'));
    expect(p.arsenal.main).toBe('shotgun');
    expect(weaponProgress(p, 'chakra')).toBe(steps('chakra'));
  });

  test('a taken, not finished weapon is offered again in the next window', () => {
    let p = createProgression();
    let r = rollLevelUp(p, Math.random);
    const w = cardWeapon(r.cards[2]);
    p = applyCard(r.progression, r.cards[2]);
    for (let i = 1; i < BALANCE.weapons[w].steps; i++) {
      r = rollLevelUp(p, Math.random);
      expect(cardWeapon(r.cards[2])).toBe(w);
      p = applyCard(r.progression, r.cards[2]);
    }
    expect(p.arsenal.main).toBe(w);
    // вкачана — далі пропонується інша
    r = rollLevelUp(p, Math.random);
    expect(cardWeapon(r.cards[2])).not.toBe(w);
  });

  test('declined weapon: the next window offers a different one', () => {
    let p = applyCard(createProgression(), weaponCard('chakra'));
    let r = rollLevelUp(p, Math.random);
    expect(cardWeapon(r.cards[2])).toBe('chakra');
    p = applyCard(r.progression, r.cards[0]); // узяв звичайну картку
    r = rollLevelUp(p, Math.random);
    expect(cardWeapon(r.cards[2])).not.toBe('chakra');
  });

  test('every weapon can be finished before the boss: at most 3 windows', () => {
    for (const id of WEAPON_IDS) expect(BALANCE.weapons[id].steps).toBeLessThanOrEqual(3);
  });

  test('all weapons maxed: no weapon cards, the 3rd card upgrades the main one', () => {
    let p = createProgression();
    for (const id of WEAPON_IDS) {
      for (let i = 0; i < BALANCE.weapons[id].steps; i++) p = applyCard(p, weaponCard(id));
    }
    expect(rollWeapon(p, Math.random)).toBeNull();
    // основна — остання вкачана: 3-тя картка — її прокачка
    const { cards } = rollLevelUp(p, seq(0, 0, 0));
    expect(cards).toHaveLength(3);
    expect(cards[2]).toBe(upgradeCard(p.arsenal.main));
  });

  test('a single remaining weapon is offered even twice in a row', () => {
    let p = createProgression();
    for (const id of ['axe', 'shotgun']) {
      for (let i = 0; i < BALANCE.weapons[id].steps; i++) p = applyCard(p, weaponCard(id));
    }
    p = { ...p, arsenal: { ...p.arsenal, lastOffered: 'chakra' } };
    expect(rollWeapon(p, Math.random)).toBe('chakra');
  });

  test('weapon card does not touch the base weapon stats', () => {
    const p = applyCard(createProgression(), weaponCard('chakra'));
    expect(p.weapon).toEqual(createProgression().weapon);
  });
});

describe('weapon upgrades (feedback-2)', () => {
  const maxed = (id) => {
    let p = createProgression();
    for (let i = 0; i < BALANCE.weapons[id].steps; i++) p = applyCard(p, weaponCard(id));
    return p;
  };
  const seq = (...xs) => () => (xs.length ? xs.shift() : 0);

  test('once a weapon is main, the 3rd card is its upgrade and other weapons are never offered', () => {
    const p = maxed('axe');
    for (let i = 0; i < 20; i++) {
      const { cards } = rollLevelUp(p, Math.random);
      expect(cards[2]).toBe(upgradeCard('axe'));
      expect(cards.filter((c) => c.startsWith('weapon:'))).toHaveLength(0);
    }
  });

  test('етап 10: прокачка без межі — після 30 прокачок 3-тя картка все ще прокачка', () => {
    let p = maxed('shotgun');
    for (let i = 0; i < 30; i++) p = applyCard(p, upgradeCard('shotgun'));
    expect(weaponUpgrades(p, 'shotgun')).toBe(30);
    const { cards } = rollLevelUp(p, seq(0, 0, 0));
    expect(cards[2]).toBe(upgradeCard('shotgun'));
  });

  test('етап 10: сокира відкривається за 1 прокачку', () => {
    const p = applyCard(createProgression(), weaponCard('axe'));
    expect(p.arsenal.main).toBe('axe');
  });

  test('a partly upgraded other weapon is not offered once a main exists', () => {
    let p = applyCard(createProgression(), weaponCard('chakra'));
    p = { ...p, arsenal: { ...p.arsenal, progress: { ...p.arsenal.progress, axe: 2 }, main: 'axe' } };
    expect(rollLevelUp(p, Math.random).cards[2]).toBe(upgradeCard('axe'));
  });
});

test('досвід за Колю — 100 (з множником біому), за уламок — 0', async () => {
  const { killXp } = await import('../src/systems/Progression.js');
  const { BALANCE } = await import('../src/config/balance.js');
  expect(killXp('kolya')).toBe(100);
  expect(killXp('kolya', { biome: 2 })).toBe(Math.round(100 * BALANCE.scaling.biomeHpMul ** 2));
  expect(killXp('kolyaPart')).toBe(0);
});

describe('етап 10: досвід і лікування після 7 рівня', () => {
  test('до 7 рівня ріст 1,22, далі 1,10', () => {
    expect(B10.xpGrowthLate).toBe(1.1);
    expect(xpToNext10(7)).toBe(Math.round(10 * 1.22 ** 6));
    expect(xpToNext10(8)).toBe(Math.round(10 * 1.22 ** 6 * 1.1));
    expect(xpToNext10(20)).toBe(Math.round(10 * 1.22 ** 6 * 1.1 ** 13));
  });
  test('до 7 рівня лікує кожен рівень, з 8-го — лише парні', () => {
    expect(healForLevels(1, 2)).toBe(1);
    expect(healForLevels(6, 9)).toBe(2); // 7 і 8
    expect(healForLevels(8, 9)).toBe(0);
    expect(healForLevels(9, 10)).toBe(1);
    expect(healForLevels(10, 14)).toBe(2); // 12 і 14
  });
  test('перший лев — на 6-й секунді', () => {
    expect(B10.enemies.lion.from).toBe(6);
  });
});

test('етап 11: Казан — досвід 120, очки й Шаги з BALANCE', async () => {
  const { killXp } = await import('../src/systems/Progression.js');
  const { killPoints } = await import('../src/systems/Score.js');
  const { BALANCE } = await import('../src/config/balance.js');
  expect(killXp('kazan')).toBe(120);
  expect(killPoints('kazan')).toBe(BALANCE.kazan.points);
  expect(BALANCE.meta.stepsPerKill.kazan).toBe(150);
});
