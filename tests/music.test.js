import { describe, expect, test } from 'vitest';
import { TRACKS, biomeMusic, bossMusic, noteToMidi, parsePattern, rageMusic, trackSteps } from '../src/systems/Music.js';
import { chord, follow, mel, midiToNote, prog } from '../src/systems/tracks/compose.js';

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

  test('"k" is a kick, "h" is a hi-hat', () => {
    expect(parsePattern('k - h -')).toEqual([
      { step: 0, kick: true, len: 1 },
      { step: 2, hat: true, len: 1 },
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
          if (e.midi !== undefined) {
            expect(e.midi, name).toBeGreaterThanOrEqual(28);
            expect(e.midi, name).toBeLessThanOrEqual(96);
          }
        }
        expect(v.vol, name).toBeLessThanOrEqual(0.12);
      }
    }
  });

  test('rage music is noticeably faster than the boss theme (every boss with a rage)', () => {
    for (const boss of ['spider', 'shkodko', 'kolya', 'kazan']) {
      expect(TRACKS[rageMusic(boss)].bpm / TRACKS[bossMusic(boss)].bpm, boss).toBeGreaterThanOrEqual(1.25);
    }
  });

  test('victory plays once (what follows is passed in by the boss director)', () => {
    expect(TRACKS.victory.loop).toBe(false);
  });

  test('every biome and every boss has its own looping track (sound v2)', () => {
    const biomes = ['cave', 'winter', 'bamboo', 'lava'].map(biomeMusic);
    const bosses = ['spider', 'bear', 'shkodko', 'kolya', 'kazan'].map(bossMusic);
    for (const n of [...biomes, ...bosses, 'menu']) {
      expect(TRACKS[n], n).toBeDefined();
      expect(TRACKS[n].loop, n).toBe(true);
    }
    expect(new Set(biomes).size).toBe(4);
    expect(new Set(bosses).size).toBe(5);
    expect(rageMusic('bear')).toBe(bossMusic('bear')); // у ведмедя люті немає
  });

  test('background loops are long enough not to grate (≥ 15 s) and quieter than boss fights', () => {
    const lengthSec = (t) => (trackSteps(t) * 60) / t.bpm / 4;
    const loudest = (t) => Math.max(...t.voices.filter((v) => v.wave !== 'noise').map((v) => v.vol));
    for (const n of ['menu', 'cave', 'winter', 'bamboo', 'lava']) {
      expect(lengthSec(TRACKS[n]), n).toBeGreaterThanOrEqual(15);
      expect(loudest(TRACKS[n]), n).toBeLessThanOrEqual(0.08);
    }
    for (const b of ['spider', 'bear', 'shkodko', 'kolya', 'kazan']) expect(lengthSec(TRACKS[bossMusic(b)]), b).toBeGreaterThanOrEqual(9);
  });
});

describe('compose helpers', () => {
  test('chords and note names', () => {
    expect(chord('Dm', 2)).toEqual([38, 41, 45]);
    expect(chord('Bb', 2)).toEqual([46, 50, 53]);
    expect(chord('E5', 2)).toEqual([40, 47]);
    expect(midiToNote(61)).toBe('C#4');
    expect(midiToNote(70)).toBe('Bb4');
    expect(() => chord('H', 2)).toThrow();
  });

  test('follow: digits are chord tones, ^ an octave up, other tokens pass through', () => {
    const p = follow(prog('Am', 2), '0 - 1 . 2^ k h x 3 - - - - - - -');
    expect(p.split(' ').slice(0, 9)).toEqual(['A2', '-', 'C3', '.', 'E4', 'k', 'h', 'x', 'A3']);
  });

  test('mel rejects a bar that is not 16 steps (typo in a track is caught)', () => {
    expect(() => mel('A4 . . .')).toThrow();
  });
});
