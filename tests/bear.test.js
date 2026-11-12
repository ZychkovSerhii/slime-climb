import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { bearBatsDue, bearJumps, bearZone, crawlMs, rearDue, reenterSide } from '../src/systems/BearPlanner.js';
import { firstSegment, nextSegment, runStage } from '../src/systems/Cycle.js';
import { killXp } from '../src/systems/Progression.js';
import { stepsForKill } from '../src/systems/Meta.js';

const BB = BALANCE.bearBoss;

describe('етап 10: ведмідь у колі біомів', () => {
  test('павучиха → ведмідь (через 90 с) → Шкодько (через 180 с після павучихи)', () => {
    const s1 = nextSegment(firstSegment(), 130);
    expect(s1).toMatchObject({ biome: 'winter', boss: 'bear', atSec: 130 + BB.afterSec, loop: 0, startSec: 130 });
    const s2 = nextSegment(s1, 240);
    expect(s2).toMatchObject({ biome: 'winter', boss: 'shkodko', atSec: 130 + BALANCE.shkodko.afterSec, loop: 0, startSec: 130 });
    expect(nextSegment(s2, 500)).toMatchObject({ biome: 'bamboo', boss: 'kolya' });
  });
  test('довгий бій з ведмедем: Шкодько не раніше ніж через shkodkoGapSec', () => {
    const s1 = nextSegment(firstSegment(), 130);
    expect(nextSegment(s1, 300).atSec).toBe(300 + BB.shkodkoGapSec);
  });
  test('режими перевірки: ?bear=1 — ведмідь, ?shkodko=1 і ?winter=1 — без ведмедя', () => {
    expect(firstSegment('bear')).toMatchObject({ biome: 'winter', boss: 'bear', atSec: BB.debugAtSec });
    expect(firstSegment('shkodko').boss).toBe('shkodko');
    expect(firstSegment('winter').boss).toBeNull();
  });
  test('бій з ведмедем — як з босом: підготовка й бій', () => {
    const s1 = nextSegment(firstSegment(), 130);
    expect(runStage(s1.atSec - 1, s1, 130)).toBe('prep');
    expect(runStage(s1.atSec, s1, 130)).toBe('fight');
  });
});

describe('етап 10: ведмідь-міні-бос', () => {
  test('серія: 2 стрибки, посилений — 3', () => {
    expect(bearJumps(false)).toBe(2);
    expect(bearJumps(true)).toBe(3);
  });
  test('повзання 2–3 с', () => {
    expect(crawlMs(() => 0)).toBe(BB.crawlMinMs);
    expect(crawlMs(() => 0.999)).toBeLessThanOrEqual(BB.crawlMaxMs);
  });
  test('зона повзання вище за гравця', () => {
    const z = bearZone(896);
    expect(z.maxY).toBe(896 - BB.zone.bottomGap);
    expect(bearZone(100).maxY).toBe(z.minY);
  });
  test('миші — раз на 20% HP', () => {
    expect(bearBatsDue(0.21, false)).toBe(false);
    expect(bearBatsDue(0.2, false)).toBe(true);
    expect(bearBatsDue(0.1, true)).toBe(false);
  });
  test('вилетів праворуч — з\'являється ліворуч', () => {
    expect(reenterSide(800, 720)).toBe('left');
    expect(reenterSide(-50, 720)).toBe('right');
  });
  test('ричання — лише без аури', () => {
    expect(rearDue(5000, 4000, false)).toBe(true);
    expect(rearDue(5000, 4000, true)).toBe(false);
    expect(rearDue(3000, 4000, false)).toBe(false);
  });
  test('нагорода: 30 Шагів, досвід як у міні-боса; сповільнення коротше за інтервал ричання', () => {
    expect(stepsForKill('bear')).toBe(30);
    expect(killXp('bear')).toBe(BB.xp);
    expect(BB.roar.durationMs).toBeLessThan(BB.rearEveryMs);
    expect(BB.aura.ms).toBeLessThan(BB.rearEveryMs);
  });
});
