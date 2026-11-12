import { afterEach, describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  PRESETS, TUNING_FIELDS, bossHpTuning, defaultTuning, isDefault, loadTuning, normalizeTuning,
  presetName, saveTuning, setTuning, stepField, tuning,
} from '../src/systems/Tuning.js';
import { bossHp, enemyHp, loopMul } from '../src/systems/Cycle.js';
import { spawnIntervalMs } from '../src/systems/Difficulty.js';
import { healForLevels } from '../src/systems/Health.js';
import { backAction } from '../src/systems/Navigation.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

afterEach(() => setTuning(defaultTuning()));

describe('Tuning: збереження і межі', () => {
  test('типові значення — «Норма»', () => {
    expect(presetName(defaultTuning())).toBe('Норма');
    expect(isDefault(tuning())).toBe(true);
  });

  test('зберігається і читається', () => {
    const s = memStorage();
    saveTuning(s, PRESETS.hard.values);
    expect(loadTuning(s)).toEqual(PRESETS.hard.values);
    expect(presetName(loadTuning(s))).toBe('Важко');
  });

  test('зламаний JSON і сміття → типові; числа обрізаються межами', () => {
    const s = memStorage();
    s.setItem('slime-climb.tuning', '{oops');
    expect(loadTuning(s)).toEqual(defaultTuning());
    const t = normalizeTuning({ enemyHp: 99, kolya: -5, heal: 'ніколи', xp: 'x' });
    expect(t.enemyHp).toBe(3);
    expect(t.kolya).toBe(0.5);
    expect(t.heal).toBe('game');
    expect(t.xp).toBe(1);
  });

  test('крок: числа в межах без похибки float, режими по колу', () => {
    let t = defaultTuning();
    t = stepField(t, 'enemyHp', 1);
    t = stepField(t, 'enemyHp', 1);
    expect(t.enemyHp).toBe(1.2);
    for (let i = 0; i < 50; i++) t = stepField(t, 'enemyHp', -1);
    expect(t.enemyHp).toBe(0.5);
    expect(stepField(defaultTuning(), 'heal', -1).heal).toBe('none');
    expect(presetName(t)).toBe('Свої');
  });

  test('усі набори проходять normalize без змін', () => {
    for (const p of Object.values(PRESETS)) expect(normalizeTuning(p.values)).toEqual(p.values);
    for (const f of TUNING_FIELDS) expect(defaultTuning()).toHaveProperty(f.key);
  });
});

describe('Tuning: множники в грі', () => {
  test('«Норма» нічого не міняє', () => {
    expect(enemyHp(4, 0)).toBe(4);
    expect(bossHp(55, 0, 'boss')).toBe(55);
    expect(loopMul(0).speed).toBe(1);
  });

  test('HP ворогів, швидкість і спавн', () => {
    const base = spawnIntervalMs('lion', 0);
    setTuning({ ...defaultTuning(), enemyHp: 2, enemySpeed: 1.5, spawn: 2 });
    expect(enemyHp(4, 0)).toBe(8);
    expect(loopMul(0).speed).toBe(1.5);
    expect(spawnIntervalMs('lion', 0)).toBeCloseTo(base / 2);
  });

  test('HP кожного боса окремо; уламки Колі — як Коля', () => {
    setTuning({ ...defaultTuning(), shkodko: 2, kolya: 1.5 });
    expect(bossHp(BALANCE.shkodko.hp, 0, 'shkodko')).toBe(BALANCE.shkodko.hp * 2);
    expect(bossHp(BALANCE.boss.hp, 0, 'boss')).toBe(BALANCE.boss.hp);
    expect(bossHpTuning('kolyaPart')).toBe(1.5);
    expect(bossHpTuning('lion')).toBe(1);
  });

  test('лікування: режими', () => {
    expect(healForLevels(1, 10, 'game')).toBe(healForLevels(1, 10));
    expect(healForLevels(1, 10, 'every')).toBe(9);
    expect(healForLevels(1, 10, 'even')).toBe(5);
    expect(healForLevels(1, 10, 'none')).toBe(0);
  });

  test('«Назад» на екрані складності — у меню', () => {
    expect(backAction(['Tuning'], false)).toBe('menu');
  });
});
