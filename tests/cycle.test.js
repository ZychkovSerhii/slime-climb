import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { firstSegment, loopMul, nextSegment, runStage, scaledHp } from '../src/systems/Cycle.js';

const B = BALANCE.boss;

describe('коло біомів', () => {
  test('печера з павучихою → зима зі Шкодьком → бамбук з Колею → печера наступного кола', () => {
    const s0 = firstSegment();
    expect(s0).toMatchObject({ biome: 'cave', boss: 'spider', atSec: B.atSec, loop: 0 });
    const s1 = nextSegment(s0, 130);
    expect(s1).toMatchObject({ biome: 'winter', boss: 'shkodko', atSec: 130 + BALANCE.shkodko.afterSec, loop: 0, startSec: 130 });
    const s2 = nextSegment(s1, 400);
    expect(s2).toMatchObject({ biome: 'bamboo', boss: 'kolya', atSec: 400 + BALANCE.kolya.afterSec, loop: 0, startSec: 400 });
    const s3 = nextSegment(s2, 700);
    expect(s3).toMatchObject({ biome: 'cave', boss: 'spider', atSec: 700 + B.atSec, loop: 1 });
    expect(nextSegment(s3, 900)).toMatchObject({ boss: 'shkodko', loop: 1 });
  });

  test('режими перевірки', () => {
    expect(firstSegment('winter')).toMatchObject({ biome: 'winter', boss: null });
    expect(firstSegment('shkodko')).toMatchObject({ biome: 'winter', boss: 'shkodko', atSec: BALANCE.shkodko.debugAtSec });
    expect(firstSegment('spider').atSec).toBe(B.debugAtSec);
    expect(firstSegment('bamboo')).toMatchObject({ biome: 'bamboo', boss: null });
    expect(firstSegment('kolya')).toMatchObject({ biome: 'bamboo', boss: 'kolya', atSec: BALANCE.kolya.debugAtSec });
  });

  test('етапи: before → prep → fight, після смерті calm → after', () => {
    const s0 = firstSegment();
    expect(runStage(10, s0)).toBe('before');
    expect(runStage(B.atSec - B.prepSec - 0.1, s0)).toBe('before');
    expect(runStage(B.atSec - 0.1, s0)).toBe('prep');
    expect(runStage(B.atSec + 400, s0)).toBe('fight');
    expect(runStage(130 + B.calmSec - 0.1, nextSegment(s0, 130), 130)).toBe('calm');
    expect(runStage(B.atSec - B.prepSec, s0)).toBe('prep');
    expect(runStage(B.atSec, s0)).toBe('fight');
    const s1 = nextSegment(s0, 130);
    expect(runStage(130, s1, 130)).toBe('calm');
    expect(runStage(130 + B.calmSec, s1, 130)).toBe('after');
    expect(runStage(s1.atSec, s1, 130)).toBe('fight');
  });

  test('зима без боса ніколи не доходить до бою', () => {
    expect(runStage(1e6, firstSegment('winter'))).toBe('before');
  });

  test('множники кола', () => {
    expect(loopMul(0)).toEqual({ hp: 1, speed: 1 });
    expect(loopMul(2).hp).toBeCloseTo(1.35 ** 2);
    expect(loopMul(1).speed).toBeCloseTo(1.08);
    expect(scaledHp(2, 1)).toBe(3);
    expect(scaledHp(85, 0)).toBe(85);
    expect(scaledHp(1, 0)).toBe(1);
  });
});
