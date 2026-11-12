import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { biomeIndex, bossHp, enemyHp, enhanced, firstSegment, loopMul, nextSegment, runStage } from '../src/systems/Cycle.js';

const B = BALANCE.boss;

describe('коло біомів', () => {
  test('печера з павучихою → зима зі Шкодьком → бамбук з Колею → печера наступного кола', () => {
    const s0 = firstSegment();
    expect(s0).toMatchObject({ biome: 'cave', boss: 'spider', atSec: B.atSec, loop: 0 });
    const s1 = nextSegment(nextSegment(s0, 130), 230); // етап 10: між ними ведмідь
    expect(s1).toMatchObject({ biome: 'winter', boss: 'shkodko', atSec: 130 + BALANCE.shkodko.afterSec, loop: 0, startSec: 130 });
    const s2 = nextSegment(s1, 400);
    expect(s2).toMatchObject({ biome: 'bamboo', boss: 'kolya', atSec: 400 + BALANCE.kolya.afterSec, loop: 0, startSec: 400 });
    const s3 = nextSegment(s2, 700);
    expect(s3).toMatchObject({ biome: 'cave', boss: 'spider', atSec: 700 + B.atSec, loop: 1 });
    expect(nextSegment(s3, 900)).toMatchObject({ boss: 'bear', loop: 1 });
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

  test('етап 10: лічильник біомів', () => {
    expect(biomeIndex({ loop: 0, biome: 'cave' })).toBe(0);
    expect(biomeIndex({ loop: 0, biome: 'winter' })).toBe(1);
    expect(biomeIndex({ loop: 0, biome: 'bamboo' })).toBe(2);
    expect(biomeIndex({ loop: 1, biome: 'winter' })).toBe(4);
  });

  test('етап 10: HP звичайних ворогів ×1,15 за біом, босів ×1,5 за коло', () => {
    expect(BALANCE.scaling.biomeHpMul).toBe(1.15);
    expect(BALANCE.scaling.bossHpMul).toBe(1.5);
    expect(enemyHp(4, 0)).toBe(4);
    expect(enemyHp(4, 2)).toBe(5);
    expect(enemyHp(1, 0)).toBe(1);
    expect(bossHp(55, 0)).toBe(55);
    expect(bossHp(55, 1)).toBe(83);
    expect(loopMul(1).speed).toBeCloseTo(1.08);
  });

  test('етап 10: властивості — з другого кола', () => {
    expect(enhanced(0)).toBe(false);
    expect(enhanced(1)).toBe(true);
  });
});
