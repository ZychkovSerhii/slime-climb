import { describe, expect, test } from 'vitest';
import { TRACKS, noteToMidi, parsePattern, trackSteps } from '../src/systems/Music.js';

describe('pattern notation', () => {
  test('note names → MIDI', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('C#4')).toBe(61);
    expect(noteToMidi('Bb3')).toBe(58);
  });

  test('"." holds the previous note, "-" is a rest', () => {
    expect(parsePattern('A2 . - E3 . . - -')).toEqual([
      { step: 0, midi: 45, len: 2 },
      { step: 3, midi: 52, len: 3 },
    ]);
  });

  test('"x" is a noise hit (drums)', () => {
    expect(parsePattern('x - x .')).toEqual([
      { step: 0, noise: true, len: 1 },
      { step: 2, noise: true, len: 2 },
    ]);
  });

  test('unknown token throws (typo in a track is caught by tests)', () => {
    expect(() => parsePattern('A2 Q9')).toThrow();
  });
});

describe('tracks', () => {
  test('each track: all voices have the same whole number of bars, notes in a sane range', () => {
    for (const [name, t] of Object.entries(TRACKS)) {
      const steps = trackSteps(t);
      expect(steps % 16, name).toBe(0);
      for (const v of t.voices) {
        expect(v.pattern.trim().split(/\s+/).length, `${name}/${v.wave}`).toBe(steps);
        for (const e of parsePattern(v.pattern)) {
          if (!e.noise) {
            expect(e.midi, name).toBeGreaterThanOrEqual(28);
            expect(e.midi, name).toBeLessThanOrEqual(96);
          }
        }
        expect(v.vol, name).toBeLessThanOrEqual(0.12);
      }
    }
  });

  test('rage music is noticeably faster than the boss theme', () => {
    expect(TRACKS.rage.bpm / TRACKS.boss.bpm).toBeGreaterThanOrEqual(1.25);
  });

  test('victory plays once and hands over to the after-boss theme', () => {
    expect(TRACKS.victory.loop).toBe(false);
    expect(TRACKS[TRACKS.victory.next]).toBeDefined();
    for (const n of ['boss', 'rage', 'after']) expect(TRACKS[n].loop, n).toBe(true);
  });
});
