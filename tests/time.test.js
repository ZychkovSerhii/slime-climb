import { expect, test } from 'vitest';
import { clampDelta } from '../src/systems/Time.js';

test('normal frame delta is unchanged', () => expect(clampDelta(16)).toBe(16));
test('long frame (return from background) is capped at maxDeltaMs', () => expect(clampDelta(5000)).toBe(50));
test('negative delta becomes 0', () => expect(clampDelta(-3)).toBe(0));
