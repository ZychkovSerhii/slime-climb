import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  afterPartDeath, createLungeClock, eatHeal, endLunge, fanAngles, kolyaBounds, kolyaHpFloor, kolyaMode, kolyaPhase,
  snakePos, splitHp, spitterTarget, tryLunge,
} from '../src/systems/KolyaPlanner.js';
import { scaledHp } from '../src/systems/Cycle.js';

const K = BALANCE.kolya;

describe('Коля: фази й пороги', () => {
  test('HP 110 — сумарно ×1,3 від Шкодька', () => {
    expect(Math.abs(K.hp - BALANCE.shkodko.hp * 1.3)).toBeLessThanOrEqual(1); // 85 × 1,3 = 110,5 → у специфікації 110
  });

  test('народження на 80%, поділ на 40%; фази не відкочуються', () => {
    expect(kolyaPhase(0.9, { born: false, split: false })).toBe('p1');
    expect(kolyaPhase(0.8, { born: false, split: false })).toBe('birth');
    expect(kolyaPhase(0.95, { born: true, split: false })).toBe('p2'); // підлікувався — все одно фаза 2
    expect(kolyaPhase(0.4, { born: true, split: false })).toBe('split');
    expect(kolyaPhase(0.1, { born: true, split: true })).toBe('parts');
  });

  test('сильний удар не перескакує подію: HP тримається на порозі', () => {
    expect(kolyaHpFloor(110, { born: false, split: false })).toBe(88);
    expect(kolyaHpFloor(110, { born: true, split: false })).toBe(44);
    expect(kolyaHpFloor(110, { born: true, split: true })).toBe(0);
  });

  test('поділ: сума збережена, уламки рівні (±1), кожен ≥ 1', () => {
    expect(splitHp(44)).toEqual([15, 15, 14]);
    expect(splitHp(44).reduce((a, b) => a + b)).toBe(44);
    expect(splitHp(2)).toEqual([1, 1, 1]);
    expect(splitHp(59, 3)).toEqual([20, 20, 19]);
  });

  test('з\'їдання лікує до 15% від maxHp кола, але не зменшує HP', () => {
    expect(eatHeal(3, 110)).toBe(17);
    expect(eatHeal(3, scaledHp(110, 1))).toBe(Math.round(0.15 * scaledHp(110, 1)));
    expect(eatHeal(30, 110)).toBe(30);
  });

  test('після смерті уламків: лишився один — з\'їдання, нікого — бос мертвий, з\'їдання раз', () => {
    expect(afterPartDeath(2, false)).toBe('none');
    expect(afterPartDeath(1, false)).toBe('eat'); // зокрема коли двоє загинули в одному кадрі
    expect(afterPartDeath(0, false)).toBe('dead'); // усі троє в одному кадрі
    expect(afterPartDeath(0, true)).toBe('dead');
    expect(afterPartDeath(1, true)).toBe('none');
  });

  test('режими: ривки частішають, лють найшвидша', () => {
    const p1 = kolyaMode('p1');
    const p2 = kolyaMode('p2');
    const part = kolyaMode('part');
    const rage = kolyaMode('rage');
    expect(p1.spitEveryMs).toBe(0);
    expect(p2.lungeEveryMs).toBeLessThan(p1.lungeEveryMs);
    expect(part.speedMul).toBe(K.split.speedMul);
    expect(rage.lungeEveryMs).toBe(K.rage.lungeEveryMs);
    expect(rage.fan).toBe(3);
  });
});

describe('Коля: рух і атаки', () => {
  const b = kolyaBounds(720, 72, 896);

  test('зона: між стінами й вище за гравця', () => {
    expect(b.minX).toBe(BALANCE.wallWidth + 72);
    expect(b.maxX).toBe(720 - BALANCE.wallWidth - 72);
    expect(b.maxY).toBe(896 - K.zone.bottomGap);
  });

  test('змійка не виходить за зону', () => {
    for (let t = 0; t < 20000; t += 137) {
      const p = snakePos(t, b);
      expect(p.x).toBeGreaterThanOrEqual(b.minX - 1e-6);
      expect(p.x).toBeLessThanOrEqual(b.maxX + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(b.minY - 1e-6);
      expect(p.y).toBeLessThanOrEqual(b.maxY + 1e-6);
    }
  });

  test('ривки по черзі: поки один телеграфує чи летить, інший чекає; між ними пауза gapMs', () => {
    let c = createLungeClock();
    let r = tryLunge(c, 1000);
    expect(r.go).toBe(true);
    c = r.clock;
    expect(tryLunge(c, 1000).go).toBe(false); // той самий кадр — другий уламок
    expect(tryLunge(c, 5000).go).toBe(false); // перший ще в ривку
    c = endLunge(c, 5000);
    expect(tryLunge(c, 5000 + K.lunge.gapMs - 1).go).toBe(false);
    expect(tryLunge(c, 5000 + K.lunge.gapMs).go).toBe(true);
  });

  test('віяло симетричне навколо прицілу', () => {
    const a = fanAngles(0, 3, 15);
    expect(a).toHaveLength(3);
    expect(a[1]).toBe(0);
    expect(a[0]).toBeCloseTo(-a[2]);
    expect(fanAngles(1, 1, 15)).toEqual([1]);
  });

  test('личинка-стрілець тримає дистанцію і завжди вище за гравця', () => {
    const S = BALANCE.enemies.slugSpitter;
    const player = { x: 100, y: 896 };
    for (const self of [{ x: 600, y: 900 }, { x: 110, y: 1200 }, { x: 400, y: 200 }]) {
      const t = spitterTarget(player, self, b);
      expect(t.y).toBeLessThanOrEqual(player.y - S.minAbovePx);
      expect(t.x).toBeGreaterThanOrEqual(b.minX);
      expect(t.x).toBeLessThanOrEqual(b.maxX);
    }
    const far = spitterTarget(player, { x: 400, y: 200 }, b);
    expect(Math.hypot(far.x - player.x, far.y - player.y)).toBeGreaterThanOrEqual(S.keepPx - 1);
  });
});
