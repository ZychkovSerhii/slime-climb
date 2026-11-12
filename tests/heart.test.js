import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { createHeartState, heartDue, heartSide } from '../src/systems/Heart.js';

const H = BALANCE.heart;
const half = () => 0.5;

describe('етап 10: сердечко', () => {
  test('не раніше першої хвилини', () => {
    const s = createHeartState();
    expect(heartDue(s, { tSec: H.firstSec - 0.1, livesFull: false }, half).spawn).toBe(false);
    expect(heartDue(s, { tSec: H.firstSec, livesFull: false }, half).spawn).toBe(true);
  });

  test('далі раз на випадкові 20–70 с', () => {
    const lo = heartDue(createHeartState(), { tSec: 60, livesFull: false }, () => 0).state.nextAt;
    const hi = heartDue(createHeartState(), { tSec: 60, livesFull: false }, () => 0.999999).state.nextAt;
    expect(lo).toBeCloseTo(60 + H.minSec);
    expect(hi).toBeCloseTo(60 + H.maxSec, 3);
  });

  test('повні життя — не з\'являється; після втрати життя — не раніше ніж через afterFullSec', () => {
    const s = createHeartState();
    const r = heartDue(s, { tSec: 100, livesFull: true }, half);
    expect(r.spawn).toBe(false);
    expect(r.state.nextAt).toBe(100 + H.afterFullSec);
    // одразу після удару (життя вже не повні) — ще рано
    expect(heartDue(r.state, { tSec: 101, livesFull: false }, half).spawn).toBe(false);
    expect(heartDue(r.state, { tSec: 100 + H.afterFullSec, livesFull: false }, half).spawn).toBe(true);
  });

  test('повні життя не зсувають таймер назад', () => {
    const s = { nextAt: 500, lastFight: null };
    expect(heartDue(s, { tSec: 100, livesFull: true }, half).state).toEqual(s);
  });

  test('у бою — щонайбільше одне за бій', () => {
    let s = createHeartState();
    let r = heartDue(s, { tSec: 60, livesFull: false, fight: 'f1' }, () => 0);
    expect(r.spawn).toBe(true);
    r = heartDue(r.state, { tSec: 200, livesFull: false, fight: 'f1' }, () => 0);
    expect(r.spawn).toBe(false);
    expect(heartDue(r.state, { tSec: 200, livesFull: false, fight: 'f2' }, () => 0).spawn).toBe(true);
    expect(heartDue(r.state, { tSec: 200, livesFull: false, fight: null }, () => 0).spawn).toBe(true);
  });

  test('не ближче spikeGapPx до шипа на тій самій стіні', () => {
    const y = -20;
    expect(heartSide([], y, () => 0.1)).toBe('left');
    expect(heartSide([{ side: 'left', y: y + H.spikeGapPx - 1 }], y, () => 0.1)).toBe('right');
    expect(heartSide([{ side: 'left', y: y + H.spikeGapPx + 1 }], y, () => 0.1)).toBe('left');
    expect(heartSide([{ side: 'left', y: y + 10 }, { side: 'right', y: y - 30 }], y, () => 0.1)).toBeNull();
  });
});
