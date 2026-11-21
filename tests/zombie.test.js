import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { henDodgeX, strikeEveryMs, strikeHits, strikeZone, summonWave, swaySpeed, zombieHpFloor, zombiePhase } from '../src/systems/ZombiePlanner.js';

const Z = BALANCE.zombie;
const none = { summoned: false, mounted: false, henDead: false };

describe('Мрець-Велетень', () => {
  test('ТЗ: HP 700, курка 230, швидкості 120 → 700 → 240', () => {
    expect(Z.hp).toBe(700);
    expect(Z.hen.hp).toBe(230);
    expect(swaySpeed(none)).toBe(120);
    expect(swaySpeed({ ...none, summoned: true, mounted: true })).toBe(700);
    expect(swaySpeed({ summoned: true, mounted: true, henDead: true })).toBe(240);
  });

  test('фази: 65% — мерці, 40% — курка, курка загинула — лють', () => {
    expect(zombiePhase(1, none)).toBe('p1');
    expect(zombiePhase(0.65, none)).toBe('summon');
    expect(zombiePhase(0.5, { ...none, summoned: true })).toBe('p2');
    expect(zombiePhase(0.4, { ...none, summoned: true })).toBe('hen');
    expect(zombiePhase(0.4, { summoned: true, mounted: true, henDead: false })).toBe('ride');
    expect(zombiePhase(0.3, { summoned: true, mounted: true, henDead: true })).toBe('rage');
  });

  test('сильний удар не проскакує фазу', () => {
    expect(zombieHpFloor(1000, none)).toBe(650);
    expect(zombieHpFloor(1000, { ...none, summoned: true })).toBe(400);
    expect(zombieHpFloor(1000, { summoned: true, mounted: true })).toBe(0);
  });

  test('після курки удари в 1,5 раза частіше', () => {
    expect(strikeEveryMs(none) / strikeEveryMs({ henDead: true })).toBeCloseTo(1.5);
  });

  test('удар рукою — смуга на стіні гравця; інша половина коридору вільна', () => {
    const z = strikeZone('left', 900, 720);
    expect(z.x).toBe(BALANCE.wallWidth);
    expect(z.w).toBeLessThanOrEqual((720 - 2 * BALANCE.wallWidth) / 2);
    expect(strikeHits(z, BALANCE.wallWidth + 24, 900)).toBe(true);
    expect(strikeHits(z, 720 - BALANCE.wallWidth - 24, 900)).toBe(false); // інша стіна
    const r = strikeZone('right', 900, 720);
    expect(strikeHits(r, 720 - BALANCE.wallWidth - 24, 900)).toBe(true);
    // попередження довше за стрибок — встигнеш перестрибнути
    expect(Z.strike.warnMs).toBeGreaterThan(BALANCE.jumpDurationMs);
  });

  test('тулуб вище за найвищу дугу стрибка', () => {
    expect(Z.hoverAbovePx).toBeGreaterThan(BALANCE.jumpArcPx * BALANCE.holdArcMul);
  });

  test('10 малих мерців хвилями по 2', () => {
    expect(summonWave(0)).toEqual({ n: 2, last: false });
    expect(summonWave(4)).toEqual({ n: 2, last: true });
  });

  test('курка ухиляється від кулі поруч, не частіше кулдауну, у межах коридору', () => {
    const shots = [{ x: 340, y: 500 }];
    const args = { x: 360, y: 500, nowMs: 5000, lastDodgeAt: 0, shots, minX: 200, maxX: 520 };
    expect(henDodgeX(args)).toBe(360 + Z.hen.dodgePx);
    expect(henDodgeX({ ...args, lastDodgeAt: 5000 - Z.hen.dodgeCdMs + 1 })).toBe(null);
    expect(henDodgeX({ ...args, shots: [{ x: 360, y: 900 }] })).toBe(null);
    expect(henDodgeX({ ...args, x: 500, shots: [{ x: 480, y: 500 }] })).toBe(500 - Z.hen.dodgePx); // біля краю — в інший бік
  });
});
