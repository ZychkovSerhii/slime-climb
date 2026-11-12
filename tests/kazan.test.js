import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { kazanHpFloor, kazanPhase, lidPath, otherWallFree, planPour, pourBusyTo, pourFree, wallsBusy } from '../src/systems/KazanPlanner.js';

const K = BALANCE.kazan;

describe('Казан: фази й пороги (§11.3)', () => {
  test('кипіння на 70%, лють на 35%; фази не відкочуються', () => {
    expect(kazanPhase(0.9, { boiled: false, raged: false })).toBe('p1');
    expect(kazanPhase(0.7, { boiled: false, raged: false })).toBe('boil');
    expect(kazanPhase(0.95, { boiled: true, raged: false })).toBe('p2');
    expect(kazanPhase(0.35, { boiled: true, raged: false })).toBe('rage-start');
    expect(kazanPhase(0.9, { boiled: true, raged: true })).toBe('rage');
  });
  test('HP на порозі завжди запускає подію — для будь-якого maxHp (коло, «Складність»)', () => {
    for (let max = 100; max < 800; max += 7) {
      const b = kazanHpFloor(max, { boiled: false, raged: false });
      expect(kazanPhase(b / max, { boiled: false, raged: false }), `boil ${max}`).toBe('boil');
      const r = kazanHpFloor(max, { boiled: true, raged: false });
      expect(kazanPhase(r / max, { boiled: true, raged: false }), `rage ${max}`).toBe('rage-start');
    }
  });
  test('удар з 100% до 20% за раз — HP тримається на 70%, і кипіння не пропускається', () => {
    const max = 230;
    const floor = kazanHpFloor(max, { boiled: false, raged: false });
    expect(floor).toBe(161);
    const hp = Math.max(0.2 * max, floor);
    expect(kazanPhase(hp / max, { boiled: false, raged: false })).toBe('boil');
    expect(kazanHpFloor(max, { boiled: true, raged: false })).toBeCloseTo(80.5);
    expect(kazanHpFloor(max, { boiled: true, raged: true })).toBe(0);
  });
});

describe('Казан: виливання не займає обидві стіни (§11.3)', () => {
  const run = (phase, enhanced, seed) => {
    let st = seed;
    const rng = () => (st = (st * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pours = [];
    let last = null;
    let now = 0;
    for (let i = 0; i < 1000; i++) {
      const playerSide = rng() < 0.5 ? 'left' : 'right';
      const p = planPour({ phase, last, nowMs: now, playerSide, enhanced });
      pours.push(p);
      last = p;
      now = p.pourFrom + rng() * 300; // наступне планування — десь після початку цього
    }
    return pours;
  };
  test.each([['p1', false], ['p2', true], ['rage', false], ['rage', true]])('%s, коло 2+: %s — ніколи обидві', (phase, enhanced) => {
    const pours = run(phase, enhanced, 7);
    const end = pours.at(-1).pourTo + K.pour.puddleMs + 1;
    for (let t = 0; t < end; t += 37) {
      const b = wallsBusy(pours, t);
      expect(b.left && b.right).toBe(false);
    }
  });
  test('у люті стіни чергуються, між кінцем однієї (з калюжею) і початком іншої — вікно ≥ 0,9 с', () => {
    const pours = run('rage', true, 3);
    for (let i = 1; i < pours.length; i++) {
      expect(pours[i].side).not.toBe(pours[i - 1].side);
      expect(pours[i].pourFrom - pourBusyTo(pours[i - 1])).toBeGreaterThanOrEqual(K.rage.gapMs);
    }
  });
  test('калюжа — лише з 2-го кола: стіна зайнята ще puddleMs після виливання', () => {
    const p = planPour({ phase: 'p1', last: null, nowMs: 0, playerSide: 'left', enhanced: true });
    expect(pourBusyTo(p)).toBe(p.pourTo + K.pour.puddleMs);
    const q = planPour({ phase: 'p1', last: null, nowMs: 0, playerSide: 'left', enhanced: false });
    expect(pourBusyTo(q)).toBe(q.pourTo);
  });
  test('поза люттю Казан виливає на стіну гравця, попередження — warnMs до виливання', () => {
    const p = planPour({ phase: 'p1', last: null, nowMs: 1000, playerSide: 'right', enhanced: false });
    expect(p.side).toBe('right');
    expect(p.pourFrom - p.warnFrom).toBe(K.pour.warnMs);
    expect(p.pourTo - p.pourFrom).toBe(K.pour.pourMs);
  });
});

describe('Кришка-бумеранг (§11.3)', () => {
  test('туди — на висоті гравця рівномірно, назад — вище (бот: синусоїда зависала біля стіни гравця)', () => {
    const f = K.lid.flightMs;
    expect(lidPath(0, 100, 600, f)).toMatchObject({ x: 100, dy: 0, returning: false });
    expect(lidPath(f / 4, 100, 600, f).x).toBeCloseTo(350);
    expect(lidPath(f / 2, 100, 600, f).x).toBeCloseTo(600);
    const back = lidPath(f * 0.75, 100, 600, f);
    expect(back.returning).toBe(true);
    expect(back.dy).toBe(-K.lid.returnDyPx);
    expect(lidPath(f, 100, 600, f).x).toBeCloseTo(100);
  });
  test('біля стіни гравця кришка буває коротше за стрибок — від неї рятує стрибок', () => {
    const f = K.lid.flightMs;
    let near = 0;
    for (let t = 0; t <= f; t += 1) {
      const p = lidPath(t, 100, 600, f);
      if (p.dy === 0 && Math.abs(p.x - 600) < BALANCE.playerSize) near += 1;
    }
    expect(near).toBeLessThan(BALANCE.jumpDurationMs);
  });
});

describe('Казан: від магми й кришки завжди є куди стрибнути (бот: 237 «безвихідних» магм)', () => {
  test('атака на висоту гравця лише тоді, коли протилежна стіна вільна на весь час ухилу', () => {
    const pour = { side: 'right', warnFrom: 1000, pourFrom: 1800, pourTo: 3300, enhanced: true }; // зайнята 1800–5300
    expect(otherWallFree([pour], 'left', 0, 1700)).toBe(true); // закінчиться до лави
    expect(otherWallFree([pour], 'left', 0, 1900)).toBe(false);
    expect(otherWallFree([pour], 'left', 5400, 1000)).toBe(true); // калюжа вже зникла
    expect(otherWallFree([pour], 'right', 2000, 1000)).toBe(true); // гравець на правій — тікати на ліву
  });
});

describe('Казан: магма й кришка не під час виливання (бот: удар без виходу в фазі 2)', () => {
  test('атаки на висоту гравця — лише коли жодна стіна не жевріє й не в лаві на весь час польоту', () => {
    const pour = { side: 'left', warnFrom: 1000, pourFrom: 1800, pourTo: 3300, enhanced: false };
    expect(pourFree([pour], 0, 900)).toBe(true);
    expect(pourFree([pour], 0, 1100)).toBe(false); // жевріння вже теж рахується: гравець мусить стрибати
    expect(pourFree([pour], 3400, 1000)).toBe(true);
    expect(pourFree([{ ...pour, enhanced: true }], 3400, 1000)).toBe(false); // калюжа
  });
});
