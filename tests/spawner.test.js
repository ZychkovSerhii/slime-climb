import { describe, expect, test } from 'vitest';
import { createSpawnState, dueSpawns } from '../src/systems/Spawner.js';

function run(times, bossActive = false) {
  let state = createSpawnState();
  let last = [];
  for (const t of times) {
    const r = dueSpawns(state, t, bossActive);
    state = r.state;
    last = r.spawn;
  }
  return { state, last };
}

describe('dueSpawns', () => {
  test('initial nextAt equals each type\'s "from"', () => {
    expect(createSpawnState().nextAt).toEqual({ lion: 10, bat: 30, plant: 45 });
  });

  test('nothing before the first enemy time', () => {
    expect(dueSpawns(createSpawnState(), 5, false).spawn).toEqual([]);
  });

  test('lion at t=10', () => {
    expect(dueSpawns(createSpawnState(), 10, false).spawn).toContain('lion');
  });

  test('bat at t=30 after previous calls', () => {
    const { last } = run([5, 10, 20, 30]);
    expect(last).toContain('bat');
  });

  test('repeated call with the same t → nothing', () => {
    const first = dueSpawns(createSpawnState(), 10, false);
    expect(dueSpawns(first.state, 10, false).spawn).toEqual([]);
  });

  test('next spawn is scheduled spawnIntervalMs later', () => {
    const r = dueSpawns(createSpawnState(), 10, false);
    expect(r.state.nextAt.lion).toBeCloseTo(10 + (6300 * (1 - 0.6 * (10 / 180))) / 1000, 9);
  });

  test('does not mutate the input state', () => {
    const s = createSpawnState();
    dueSpawns(s, 10, false);
    expect(s.nextAt.lion).toBe(10);
  });

  test('boss active → no spawns, and no burst after the boss', () => {
    let state = run([10, 30, 45, 100]).state;
    const during = dueSpawns(state, 125, true);
    expect(during.spawn).toEqual([]);
    const after = dueSpawns(during.state, 126, false).spawn;
    for (const type of ['lion', 'bat', 'plant']) {
      expect(after.filter((x) => x === type).length).toBeLessThanOrEqual(1);
    }
    expect(after.length).toBeLessThanOrEqual(1);
  });
});

test('intervalMul stretches the next interval (gradual return after the boss)', () => {
  const normal = dueSpawns(createSpawnState(), 10, false).state.nextAt.lion - 10;
  const slow = dueSpawns(createSpawnState(), 10, false, 2).state.nextAt.lion - 10;
  expect(slow).toBeCloseTo(normal * 2, 9);
});

describe('бамбук (етап 9)', () => {
  test('перші появи — з BALANCE.bamboo.from від початку біому', () => {
    const st = createSpawnState('bamboo', 400);
    expect(st.nextAt).toEqual({ lantern: 403, bat: 408, ninja: 410 });
    expect(dueSpawns(st, 403, false).spawn).toEqual(['lantern']);
  });
});
