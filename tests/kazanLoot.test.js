import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { canBoil, KAZAN_LOOT_IDS, ladleDamage, ringVictims, useBoil } from '../src/systems/KazanLoot.js';
import { activeForm, formSkin } from '../src/systems/ShkodkoLoot.js';
import { rollLoot } from '../src/systems/Skills.js';
import { cardText } from '../src/systems/CardText.js';

const L = BALANCE.kazanLoot;

describe('трофеї Казана (§11.4)', () => {
  test('вибір 1 з 2; невзята лишається на наступне коло', () => {
    expect(rollLoot([], Math.random, KAZAN_LOOT_IDS, L.offer).sort()).toEqual(['loot:iamkazan', 'loot:ladle']);
    expect(rollLoot(['ladle'], Math.random, KAZAN_LOOT_IDS, L.offer)).toEqual(['loot:iamkazan']);
    expect(rollLoot(['ladle', 'iamkazan'], Math.random, KAZAN_LOOT_IDS, L.offer)).toEqual([]);
  });
  test('«Я КАЗАН» — трансформація: діє остання взята з чотирьох, скін казанчика', () => {
    expect(activeForm(['iamkolya', 'iamkazan'])).toBe('iamkazan');
    expect(activeForm(['iamkazan', 'form'])).toBe('form');
    expect(formSkin(['iam', 'iamkazan'])).toBe('slimeKazan');
  });
  test('кільце лави — раз за рівень', () => {
    expect(canBoil(null, 3)).toBe(true);
    const s = useBoil(null, 3);
    expect(canBoil(s, 3)).toBe(false);
    expect(canBoil(s, 4)).toBe(true);
  });
  test('черпачок б\'є на 2 + бонус «Урону»', () => {
    expect(ladleDamage(BALANCE.projectileDamage)).toBe(2);
    expect(ladleDamage(BALANCE.projectileDamage + 3)).toBe(5);
  });
  test('кільце лави б\'є лише ворогів у радіусі 120 px', () => {
    const p = { x: 100, y: 100 };
    const t = [{ x: 100, y: 219, id: 'a' }, { x: 100, y: 221, id: 'b' }, { x: 180, y: 180, id: 'c' }];
    expect(ringVictims(p, t).map((e) => e.id)).toEqual(['a', 'c']);
  });
  test('тексти карток для ?cards=loot:ladle,loot:iamkazan', () => {
    expect(cardText('loot:ladle', {}, {}).title).toBe('Черпачок');
    expect(cardText('loot:iamkazan', {}, {}).title).toBe('Я КАЗАН');
  });
});
