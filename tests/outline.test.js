import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { outlineAlpha, outlineColor } from '../src/systems/Outline.js';

const O = BALANCE.traits.outline;

describe('Контур посиленого ворога (етап 11, §11.1)', () => {
  test('у лаві — холодно-блакитний, деінде — світлий', () => {
    expect(outlineColor('lava')).toBe(O.lavaColor);
    expect(outlineColor('cave')).toBe(O.color);
    expect(outlineColor('winter')).toBe(O.color);
  });
  test('пульсує в межах [alphaMin, alphaMax] з періодом pulseMs', () => {
    expect(outlineAlpha(0)).toBeCloseTo(O.alphaMin);
    expect(outlineAlpha(O.pulseMs / 2)).toBeCloseTo(O.alphaMax);
    expect(outlineAlpha(O.pulseMs)).toBeCloseTo(O.alphaMin);
    for (let t = 0; t < 3000; t += 37) {
      expect(outlineAlpha(t)).toBeGreaterThanOrEqual(O.alphaMin - 1e-9);
      expect(outlineAlpha(t)).toBeLessThanOrEqual(O.alphaMax + 1e-9);
    }
  });
});
