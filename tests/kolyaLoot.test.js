import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { KOLYA_LOOT_IDS, lootShotDamage, lootStepsBonus } from '../src/systems/KolyaLoot.js';
import { activeForm, formSkin } from '../src/systems/ShkodkoLoot.js';
import { rollLoot } from '../src/systems/Skills.js';

describe('трофеї Колі', () => {
  test('вибір 1 з 2; невзята лишається на наступне коло', () => {
    expect(rollLoot([], Math.random, KOLYA_LOOT_IDS, BALANCE.kolyaLoot.offer).sort()).toEqual(['loot:iamkolya', 'loot:larva']);
    expect(rollLoot(['larva'], Math.random, KOLYA_LOOT_IDS, BALANCE.kolyaLoot.offer)).toEqual(['loot:iamkolya']);
    expect(rollLoot(['larva', 'iamkolya'], Math.random, KOLYA_LOOT_IDS, BALANCE.kolyaLoot.offer)).toEqual([]);
  });

  test('«Я КОЛЯ» — трансформація: діє остання взята, скін слимака', () => {
    expect(activeForm(['form', 'iamkolya'])).toBe('iamkolya');
    expect(activeForm(['iamkolya', 'iam'])).toBe('iam');
    expect(formSkin(['iam', 'iamkolya'])).toBe('slimeKolya');
  });

  test('шкода личинки росте з «Уроном»', () => {
    expect(lootShotDamage(1, BALANCE.projectileDamage)).toBe(1);
    expect(lootShotDamage(1, BALANCE.projectileDamage + 2)).toBe(3);
  });
});

describe('§0: усі трофеї боса вже взяті — +50% Шагів', () => {
  test('бонус лише коли пропонувати нічого', () => {
    expect(lootStepsBonus(120, [])).toBe(60);
    expect(lootStepsBonus(100, [])).toBe(50);
    expect(lootStepsBonus(120, ['loot:larva'])).toBe(0);
  });
});
