import { describe, expect, test } from 'vitest';
import {
  activeForm, blastVictims, bombTargets, formSkin, friendlyBombDamage, rollSack, sackSkillCard, SHKODKO_LOOT_IDS, stepTicker,
} from '../src/systems/ShkodkoLoot.js';
import { lootCard, rollLoot } from '../src/systems/Skills.js';
import { applyCard, createProgression } from '../src/systems/Progression.js';
import { BALANCE } from '../src/config/balance.js';

const K = BALANCE.shkodkoLoot;

describe('трофеї Шкодька', () => {
  test('пропонуються обидві, взята більше не пропонується', () => {
    expect(rollLoot([], () => 0, SHKODKO_LOOT_IDS, K.offer).sort()).toEqual([lootCard('iam'), lootCard('sack')]);
    expect(rollLoot(['sack'], () => 0, SHKODKO_LOOT_IDS, K.offer)).toEqual([lootCard('iam')]);
    expect(rollLoot(['sack', 'iam'], () => 0, SHKODKO_LOOT_IDS, K.offer)).toEqual([]);
  });
  test('трофеї павучихи не змішуються з трофеями Шкодька', () => {
    for (const c of rollLoot([], Math.random)) expect(SHKODKO_LOOT_IDS.map(lootCard)).not.toContain(c);
  });
});

describe('трансформації', () => {
  test('діє остання взята: «Я ШКОДЬКО» скасовує павука і навпаки', () => {
    expect(activeForm([])).toBeNull();
    expect(activeForm(['armor', 'form'])).toBe('form');
    expect(activeForm(['form', 'sack', 'iam'])).toBe('iam');
    expect(activeForm(['iam', 'form'])).toBe('form');
    expect(formSkin(['form', 'iam'])).toBe('slimeShkodko');
    expect(formSkin(['iam', 'form'])).toBe('slimeSpider');
    expect(formSkin(['sack'])).toBeNull();
  });
});

describe('таймер', () => {
  test('перший раз через everyMs, далі рівно щоeveryMs, без втрат на великому кроці', () => {
    let r = stepTicker(null, 1000, 500);
    expect(r.count).toBe(0);
    r = stepTicker(r.state, 1499, 500);
    expect(r.count).toBe(0);
    r = stepTicker(r.state, 1500, 500);
    expect(r.count).toBe(1);
    r = stepTicker(r.state, 3100, 500);
    expect(r.count).toBe(3);
  });
});

describe('мішок', () => {
  test('ваги: межі rng дають крайні результати', () => {
    expect(rollSack(() => 0)).toBe('bombs');
    expect(rollSack(() => 0.9999)).toBe('skill');
  });
  test('частоти близькі до ваг', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 20000;
    const counts = {};
    for (let i = 0; i < n; i++) {
      const k = rollSack(rng);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const total = Object.values(K.sack.weights).reduce((a, b) => a + b, 0);
    for (const [k, w] of Object.entries(K.sack.weights)) expect(counts[k] / n).toBeCloseTo(w / total, 1);
  });
  test('прокачка: лише взяті навички, не на максимумі, не зброя', () => {
    let p = createProgression();
    expect(sackSkillCard(p, () => 0)).toBeNull();
    p = applyCard(p, 'weapon:axe');
    expect(sackSkillCard(p, () => 0)).toBeNull();
    p = applyCard(p, 'damage');
    expect(sackSkillCard(p, () => 0.99)).toBe('damage');
    for (let i = 0; i < BALANCE.skills.hat.maxPicks; i++) p = applyCard(p, 'hat');
    expect(sackSkillCard(p, () => 0.99)).toBe('damage'); // шляпи на максимумі
  });
});

describe('свої бомби', () => {
  test('цілі — n найближчих', () => {
    const t = [{ x: 0, y: 500 }, { x: 0, y: 100 }, { x: 0, y: 300 }];
    expect(bombTargets({ x: 0, y: 0 }, t, 2)).toEqual([{ x: 0, y: 100 }, { x: 0, y: 300 }]);
    expect(bombTargets({ x: 0, y: 0 }, [], 2)).toEqual([]);
  });
  test('шкода росте з «Уроном», вибух — у радіусі', () => {
    expect(friendlyBombDamage(BALANCE.projectileDamage)).toBe(K.bomb.damage);
    expect(friendlyBombDamage(BALANCE.projectileDamage + 2)).toBe(K.bomb.damage + 2);
    const r = K.bomb.radiusPx;
    expect(blastVictims({ x: 0, y: 0 }, [{ x: r, y: 0 }, { x: r + 1, y: 0 }])).toEqual([{ x: r, y: 0 }]);
  });
});
