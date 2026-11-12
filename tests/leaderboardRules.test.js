import { describe, expect, test } from 'vitest';
import { isProfane } from '../src/systems/Profanity.js';
import {
  MAX_RUN_SEC, NICK_MAX, NICK_MIN, isEligibleRun, isPlausible, maxHeightPoints, validateNick,
} from '../src/systems/LeaderboardRules.js';
import { PRESETS, defaultTuning } from '../src/systems/Tuning.js';

describe('validateNick', () => {
  test('межі довжини', () => {
    expect(NICK_MIN).toBe(3);
    expect(NICK_MAX).toBe(16);
    expect(validateNick('  Сашко  ')).toEqual({ ok: true, nick: 'Сашко' });
    expect(validateNick('   ')).toEqual({ ok: false, error: 'short' });
    expect(validateNick('ab')).toEqual({ ok: false, error: 'short' });
    expect(validateNick(42)).toEqual({ ok: false, error: 'short' });
    expect(validateNick(null)).toEqual({ ok: false, error: 'short' });
    expect(validateNick('a'.repeat(16)).ok).toBe(true);
    expect(validateNick('a'.repeat(17))).toEqual({ ok: false, error: 'long' });
    expect(validateNick('ї'.repeat(16)).ok).toBe(true);
  });

  test('символи', () => {
    expect(validateNick('Slime😀')).toEqual({ ok: false, error: 'chars' });
    expect(validateNick('x<y')).toEqual({ ok: false, error: 'chars' });
    expect(validateNick('Dr_Slime-2.0')).toEqual({ ok: true, nick: 'Dr_Slime-2.0' });
    expect(validateNick("Кузя'Ї")).toEqual({ ok: false, error: 'chars' });
  });

  test('пробіли всередині згортаються', () => {
    expect(validateNick('Сашко   Ко')).toEqual({ ok: true, nick: 'Сашко Ко' });
  });

  test('мат', () => {
    expect(validateNick('xyй')).toEqual({ ok: false, error: 'profane' });
  });
});

describe('isProfane', () => {
  test.each(['хуй', 'ХУЙЙЙ', 'xyй', 'х.у.й', 'х_у_й', 'bl@dь', 'бля', 'fuck', 'FuCk_off', 'f.u.c.k', 'сука', 'suka', 'пизда', 'пiзда', 'pizdec', 'єбать', 'ебать', 'ёбаный', 'mudak', 'Shit1', 'xuy', 'huy', 'Сука Бро', 'Bro_suka', 'сучка'])(
    'ловить %s', (s) => expect(isProfane(s)).toBe(true),
  );
  test.each(['Сашко', 'Слизень', 'Скупий', 'Hello', 'Корабель', 'Ебен', 'Dr_Slime-2.0', 'Ihor', 'Шлях', 'Тарас', 'Скіпідар', 'Assassin', 'Херсон', 'Мандарин'])(
    'пропускає %s', (s) => expect(isProfane(s)).toBe(false),
  );
  // рецензія: короткі корені всередині звичайних імен і слів
  test.each(['Мусука', 'Себастьян', 'Sebastian', 'Глебушка', 'Глебус', 'Tsukasa', 'Asuka', 'Сучков', 'Kebab', 'Кебаб', 'Nebula', 'Небула', 'Rebuild', 'Небагато', 'Хлебушек', 'Требую', 'Скребу'])(
    'не ловить %s', (s) => expect(isProfane(s)).toBe(false),
  );
  test('відомі хиби: короткий корінь на початку слова', () => {
    expect(isProfane('Dickson')).toBe(true);
    expect(isProfane('Ebay')).toBe(true);
  });
});

describe('правдоподібність висоти', () => {
  test('інтеграл прокрутки', () => {
    expect(maxHeightPoints(0)).toBe(2);
    // 120·10 + 1,1·10²/2 = 1255 px → 125,5 очка → ceil 126 + запас 2
    expect(maxHeightPoints(10)).toBe(128);
    const d = maxHeightPoints(1000) - maxHeightPoints(999);
    expect(d).toBeGreaterThanOrEqual(51);
    expect(d).toBeLessThanOrEqual(53);
  });

  test('isPlausible', () => {
    expect(isPlausible({ height: maxHeightPoints(300), timeSec: 300 })).toBe(true);
    expect(isPlausible({ height: 0, timeSec: 0 })).toBe(true);
    expect(isPlausible({ height: maxHeightPoints(300) + 20, timeSec: 300 })).toBe(false);
    expect(isPlausible({ height: -1, timeSec: 10 })).toBe(false);
    expect(isPlausible({ height: 1.5, timeSec: 10 })).toBe(false);
    expect(isPlausible({ height: 10, timeSec: MAX_RUN_SEC + 1 })).toBe(false);
    expect(isPlausible({ height: 10, timeSec: Number.NaN })).toBe(false);
    expect(isPlausible({ height: '10', timeSec: 10 })).toBe(false);
    expect(isPlausible(null)).toBe(false);
  });
});

describe('isEligibleRun', () => {
  test('лише «Норма» без параметрів URL', () => {
    expect(isEligibleRun({ tuning: defaultTuning(), search: '' })).toBe(true);
    expect(isEligibleRun({ tuning: defaultTuning(), search: '?loop=1' })).toBe(false);
    expect(isEligibleRun({ tuning: PRESETS.hard.values, search: '' })).toBe(false);
    expect(isEligibleRun({ tuning: PRESETS.easy.values, search: '' })).toBe(false);
    expect(isEligibleRun({ tuning: { ...defaultTuning(), xp: 1.1 }, search: '' })).toBe(false);
  });
});
