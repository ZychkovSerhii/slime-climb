import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { createSpringState, springDue, springHeal } from '../src/systems/HotSpring.js';

const H = BALANCE.hotSpring;
const never = () => 0.999;
const always = () => 0;

describe('Гаряче джерело (фідбек-9)', () => {
  test('до смерті павучихи таймер не йде', () => {
    const r = springDue(createSpringState(), { tSec: 500, spiderDead: false, blocked: false }, always);
    expect(r.spawn).toBe(false);
    expect(r.state.startedAt).toBe(null);
  });
  test('після павучихи — кидок через хвилину, без появи шанс +5% щохвилини', () => {
    let s = springDue(createSpringState(), { tSec: 100, spiderDead: true, blocked: false }, always).state;
    expect(s.nextAt).toBe(100 + H.everySec);
    expect(springDue(s, { tSec: 159, spiderDead: true, blocked: false }, always).spawn).toBe(false);
    s = springDue(s, { tSec: 160, spiderDead: true, blocked: false }, never).state;
    expect(s.chance).toBeCloseTo(0.15);
    s = springDue(s, { tSec: 220, spiderDead: true, blocked: false }, never).state;
    expect(s.chance).toBeCloseTo(0.2);
    const hit = springDue(s, { tSec: 280, spiderDead: true, blocked: false }, () => 0.19);
    expect(hit.spawn).toBe(true);
    expect(hit.state.chance).toBe(0.1); // після появи — знову 10%
  });
  test('під час бою не з\'являється, кидок переноситься', () => {
    let s = springDue(createSpringState(), { tSec: 0, spiderDead: true, blocked: false }, always).state;
    const r = springDue(s, { tSec: 60, spiderDead: true, blocked: true }, always);
    expect(r.spawn).toBe(false);
    expect(r.state.chance).toBe(0.1);
    expect(r.state.nextAt).toBe(60 + H.retrySec);
  });
  test('лікує до максимуму, раз; з повними життями — нічого', () => {
    expect(springHeal(1, 5, false)).toBe(4);
    expect(springHeal(5, 5, false)).toBe(null);
    expect(springHeal(1, 5, true)).toBe(null);
  });
});
