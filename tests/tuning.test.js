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

describe('Tuning: поле Казана (етап 11)', () => {
  test('старі збереження без kazan → 1, межі 0,5–4', () => {
    expect(normalizeTuning({}).kazan).toBe(1);
    expect(normalizeTuning({ kazan: 9 }).kazan).toBe(4);
    expect(bossHpTuning('kazan')).toBe(1);
  });
  test('«Важко» не множить нові HP двічі', () => {
    expect(PRESETS.hard.values).toMatchObject({ shkodko: 1.2, kolya: 1.3, kazan: 1.3 });
  });
  test('множник kazan діє на HP Казана', () => {
    setTuning({ ...defaultTuning(), kazan: 2 });
    expect(bossHpTuning('kazan')).toBe(2);
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

describe('Tuning: старі збережені набори (фінальне рев\'ю, Important #3)', () => {
  test('старий «Важко» (shkodko 1,6, kolya 2, без kazan) → новий «Важко»', () => {
    const old = { enemyHp: 1.3, enemySpeed: 1.1, spawn: 1.2, spider: 1.3, bear: 1.3, shkodko: 1.6, kolya: 2, xp: 0.8, heal: 'even' };
    expect(normalizeTuning(old)).toEqual(PRESETS.hard.values);
  });
  test('старий «Легко» без kazan → новий «Легко»', () => {
    const old = { enemyHp: 0.8, enemySpeed: 0.9, spawn: 0.8, spider: 0.8, bear: 0.8, shkodko: 0.8, kolya: 0.8, xp: 1.2, heal: 'every' };
    expect(normalizeTuning(old)).toEqual(PRESETS.easy.values);
  });
  test('свої значення без kazan не чіпаємо, лише kazan = 1', () => {
    const own = { ...defaultTuning(), kolya: 2 };
    delete own.kazan;
    expect(normalizeTuning(own)).toEqual({ ...defaultTuning(), kolya: 2 });
  });
});
