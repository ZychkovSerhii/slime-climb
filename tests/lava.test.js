import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  beamCanFire, beamHits, dropPassWindow, dropSide, dropsAllowed, salamanderDodgeWindow, salamanderFires,
  salamanderTimeline, sparkSplit,
} from '../src/systems/Lava.js';

const S = BALANCE.enemies.salamander;
const D = BALANCE.lava.drop;

describe('Саламандра (§11.2)', () => {
  test('таймлайн: 0,6 с жевріння, 0,7 с лінія, струмінь 0,4 с; посилена дихає двічі', () => {
    expect(salamanderTimeline(false)).toMatchObject({ emergeMs: 600, warnMs: 700, breathMs: 400, breaths: 1 });
    expect(salamanderTimeline(true)).toMatchObject({ breaths: 2, gapMs: 500 });
  });
  test('струмінь не стартує в перші 0,3 с після приземлення', () => {
    expect(beamCanFire(299)).toBe(false);
    expect(beamCanFire(300)).toBe(true);
    expect(beamCanFire(Infinity)).toBe(true); // гравець у повітрі давно або ще не приземлявся
  });
  test('убита до кінця лінії-попередження — струменя немає', () => {
    const tl = salamanderTimeline(false);
    expect(salamanderFires(tl.emergeMs + tl.warnMs - 1, tl)).toBe(false);
    expect(salamanderFires(tl.emergeMs + tl.warnMs, tl)).toBe(true);
    expect(salamanderFires(null, tl)).toBe(true); // жива
  });
  test('струмінь б\'є лише гравця на своїй висоті', () => {
    const half = BALANCE.playerSize / 2;
    expect(beamHits(500, 500)).toBe(true);
    expect(beamHits(500 + S.beamHalfH + half - 1, 500)).toBe(true);
    expect(beamHits(500 + S.beamHalfH + half + 1, 500)).toBe(false);
  });
  test('вікно ухилу покриває всі видихи', () => {
    const w1 = salamanderDodgeWindow(false);
    const w2 = salamanderDodgeWindow(true);
    expect(w1.fromSec).toBeCloseTo((S.emergeMs + S.warnMs) / 1000 - S.dodgeSec);
    expect(w2.toSec - w1.toSec).toBeCloseTo((S.breathMs + BALANCE.traits.salamander.gapMs) / 1000);
  });
});

describe('Іскра (§11.2)', () => {
  test('розпадається на 2 (посилена — на 3), дрібних на екрані не більше 6', () => {
    expect(sparkSplit(false, 0)).toBe(2);
    expect(sparkSplit(true, 0)).toBe(3);
    expect(sparkSplit(false, 5)).toBe(1);
    expect(sparkSplit(true, 6)).toBe(0);
    expect(sparkSplit(false, 9)).toBe(0);
  });
});

describe('Лавова крапля (§11.2): безпечна стіна', () => {
  test('під час бою з Казаном краплі вимкнені', () => {
    expect(dropsAllowed(true)).toBe(false);
    expect(dropsAllowed(false)).toBe(true);
  });
  test('вікно проходу краплі повз гравця: від кінця набухання до проходу нижче гравця', () => {
    const w = dropPassWindow(900);
    const arrive = D.swellMs / 1000 + 900 / D.speed;
    expect(w.fromSec).toBeLessThan(arrive);
    expect(w.toSec).toBeGreaterThan(arrive);
  });
  test('стіна краплі — лише та, навпроти якої вільно; обидві заблоковані — краплі немає', () => {
    const rng = () => 0.1;
    expect(dropSide(rng, { left: false, right: false })).toBe('left');
    expect(dropSide(() => 0.9, { left: false, right: false })).toBe('right');
    // blocked[side] — на стіні side є шипи у вікні. Крапля на X вимагає вільну протилежну стіну.
    expect(dropSide(rng, { left: false, right: true })).toBe('right');
    expect(dropSide(rng, { left: true, right: false })).toBe('left');
    expect(dropSide(rng, { left: true, right: true })).toBe(null);
  });
});
