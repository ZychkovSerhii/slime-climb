import { describe, expect, test } from 'vitest';
import { SOUNDS, currentMusic, drumOrNote, loadSoundPrefs, midiToHz, playMusic, soundLengthMs, sfx, stopMusic } from '../src/systems/Audio.js';

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

  test('sound prefs: music and effects separately; the old shared "muted" carries over to both', () => {
    const store = (o) => ({ getItem: (k) => (k in o ? o[k] : null) });
    expect(loadSoundPrefs(store({}))).toEqual({ music: false, sfx: false });
    expect(loadSoundPrefs(store({ 'slime-climb:muted': '1' }))).toEqual({ music: true, sfx: true });
    expect(loadSoundPrefs(store({ 'slime-climb:muted': '1', 'slime-climb:sfxMuted': '0' }))).toEqual({ music: true, sfx: false });
    expect(loadSoundPrefs(store({ 'slime-climb:musicMuted': '1' }))).toEqual({ music: true, sfx: false });
    expect(loadSoundPrefs(null)).toEqual({ music: false, sfx: false });
    expect(loadSoundPrefs({ getItem: () => { throw new Error('denied'); } })).toEqual({ music: false, sfx: false });
  });

  test('music without WebAudio still remembers what should play; afterCurrent waits for the fanfare', () => {
    playMusic('cave');
    expect(currentMusic()).toBe('cave');
    playMusic('victory', { next: 'winter' });
    expect(currentMusic()).toBe('victory');
    playMusic('winter', { afterCurrent: true }); // біом після боса — не обриває фанфару
    expect(currentMusic()).toBe('victory');
    playMusic('lava', { afterCurrent: true }); // а петлю — обриває
    stopMusic();
    playMusic('cave');
    playMusic('lava', { afterCurrent: true });
    expect(currentMusic()).toBe('lava');
    stopMusic();
    expect(currentMusic()).toBe(null);
  });

  test('drum tokens become short sounds, notes keep their length', () => {
    const voice = { wave: 'square', vol: 0.04 };
    expect(drumOrNote({ kick: true, len: 1 }, voice, 0.1)).toMatchObject({ wave: 'sine', to: 45 });
    expect(drumOrNote({ hat: true, len: 1 }, voice, 0.1)).toMatchObject({ noise: true, ms: 18 });
    expect(drumOrNote({ midi: 69, len: 4 }, voice, 0.1)).toMatchObject({ wave: 'square', from: 440, ms: 380 });
  });
});
