import { expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { buildCodex, CATEGORIES, queryCodex, SORTS } from '../src/systems/Codex.js';
import { CARD_IDS } from '../src/systems/Progression.js';
import { LOOT_IDS } from '../src/systems/Skills.js';
import { SHKODKO_LOOT_IDS } from '../src/systems/ShkodkoLoot.js';
import { SPRITES } from '../src/art/sprites/index.js';

const all = buildCodex();
const ids = new Set(all.map((e) => e.id));

test('every category from the spec has entries', () => {
  expect(CATEGORIES.map((c) => c.id)).toEqual(['character', 'weapon', 'skill', 'loot', 'enemy', 'boss', 'biome', 'skin']);
  for (const c of CATEGORIES) expect(all.some((e) => e.category === c.id), c.id).toBe(true);
});

test('nothing from BALANCE is forgotten', () => {
  for (const id of Object.keys(BALANCE.weapons)) expect(ids.has(`weapon:${id}`), id).toBe(true);
  for (const id of CARD_IDS) expect(ids.has(id), id).toBe(true);
  for (const id of [...LOOT_IDS, ...SHKODKO_LOOT_IDS]) expect(ids.has(`loot:${id}`), id).toBe(true);
  for (const id of Object.keys(BALANCE.enemies)) expect(ids.has(`enemy:${id}`), id).toBe(true);
  for (const s of BALANCE.meta.skins) expect(ids.has(`skin:${s.id}`), s.id).toBe(true);
  expect(ids.has('boss:spider') && ids.has('boss:shkodko')).toBe(true);
});

test('ids are unique, every entry has a name, a description and a known sprite', () => {
  expect(ids.size).toBe(all.length);
  const keys = new Set(SPRITES.map((s) => s.key));
  for (const e of all) {
    expect(e.name, e.id).toBeTruthy();
    expect(e.desc, e.id).toBeTruthy();
    expect(e.desc, e.id).not.toMatch(/undefined|NaN/);
    for (const f of e.facts) expect(f, e.id).not.toMatch(/undefined|NaN/);
    if (e.sprite) expect(keys.has(e.sprite), `${e.id}: ${e.sprite}`).toBe(true);
  }
});

test('numbers come from BALANCE, so the codex follows balance changes', () => {
  const bear = all.find((e) => e.id === 'enemy:bear');
  expect(bear.hp).toBe(BALANCE.enemies.bear.hp);
  expect(all.find((e) => e.id === 'boss:shkodko').hp).toBe(BALANCE.shkodko.hp);
  expect(all.find((e) => e.id === 'skin:murzik').desc).toContain(String(BALANCE.meta.skins.find((s) => s.id === 'murzik').price));
});

test('achievements are not in the codex (hidden by design)', () => {
  const titles = BALANCE.meta.achievements.map((a) => a.title);
  expect(all.some((e) => titles.includes(e.name))).toBe(false);
});

test('search is case-insensitive and by name', () => {
  const r = queryCodex(all, { query: 'ВЕДМ' });
  expect(r.map((e) => e.id)).toEqual(['enemy:bear']);
  expect(queryCodex(all, { query: '  ' }).length).toBe(all.length);
  expect(queryCodex(all, { query: 'немає такого' })).toEqual([]);
});

test('category filter', () => {
  const r = queryCodex(all, { category: 'boss' });
  expect(r.every((e) => e.category === 'boss')).toBe(true);
  expect(r.length).toBe(2);
});

test('numeric sort: strongest first, entries without the value last', () => {
  const r = queryCodex(all, { category: 'enemy', sort: 'hp' });
  const hp = r.map((e) => (typeof e.hp === 'string' ? parseFloat(e.hp) : e.hp));
  const known = hp.filter((v) => v != null);
  expect(known).toEqual([...known].sort((a, b) => b - a));
  expect(hp.slice(known.length).every((v) => v == null)).toBe(true);
  expect(r[0].id).toBe('enemy:bear');
});

test('biome sort: cave, then winter, then entries without a biome', () => {
  const r = queryCodex(all, { sort: 'biome' });
  const order = r.map((e) => e.biome);
  const firstWinter = order.indexOf('winter');
  const firstNone = order.indexOf(null);
  expect(order.lastIndexOf('cave')).toBeLessThan(firstWinter);
  expect(order.lastIndexOf('winter')).toBeLessThan(firstNone);
});

test('name sort and every sort option works without throwing; input is not mutated', () => {
  const copy = [...all];
  for (const s of SORTS) expect(queryCodex(all, { sort: s.id }).length).toBe(all.length);
  expect(all).toEqual(copy);
  expect(queryCodex(all).map((e) => e.id)).toEqual(all.map((e) => e.id)); // за замовчуванням — порядок категорій
  const names = queryCodex(all, { sort: 'name' }).map((e) => e.name);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'uk')));
});
