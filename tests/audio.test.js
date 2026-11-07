import { describe, expect, test } from 'vitest';
import { SOUNDS, midiToHz, soundLengthMs, sfx } from '../src/systems/Audio.js';

describe('audio', () => {
  test('midiToHz: A4 = 440, A5 = 880', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });

  test('every sound has positive length and sane volume', () => {
    for (const [name, tones] of Object.entries(SOUNDS)) {
      expect(tones.length, name).toBeGreaterThan(0);
      for (const t of tones) {
        expect(t.ms, name).toBeGreaterThan(0);
        expect(t.vol, name).toBeGreaterThan(0);
        expect(t.vol, name).toBeLessThanOrEqual(0.35);
        if (!t.noise) expect(t.from, name).toBeGreaterThan(20);
      }
    }
  });

  test('game over: four descending notes, the last one long (~2.3 s total)', () => {
    const notes = SOUNDS.gameOver;
    expect(notes).toHaveLength(4);
    for (let i = 1; i < notes.length; i++) expect(notes[i].from).toBeLessThan(notes[i - 1].from);
    expect(notes[3].ms).toBeGreaterThan(notes[0].ms * 3);
    expect(soundLengthMs('gameOver')).toBeGreaterThan(2000);
  });

  test('sfx is a no-op without WebAudio (tests, old WebView)', () => {
    expect(() => sfx('jump')).not.toThrow();
    expect(() => sfx('unknown')).not.toThrow();
  });
});
