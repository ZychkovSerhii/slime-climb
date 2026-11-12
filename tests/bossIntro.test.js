import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { bossIntroInfo, INTRO_BOSSES, introCanSkip, introDone } from '../src/systems/BossIntro.js';
import { SPRITES } from '../src/art/sprites/index.js';
import { TRACKS, trackSteps } from '../src/systems/Music.js';

describe('представлення босів', () => {
  test('усі боси й ведмідь (етап 10), ім\'я з BALANCE, спрайт і мелодія існують', () => {
    expect(INTRO_BOSSES).toEqual(['spider', 'shkodko', 'kolya', 'bear', 'kazan']);
    const names = { spider: BALANCE.boss.name, shkodko: BALANCE.shkodko.name, kolya: BALANCE.kolya.name, bear: BALANCE.bearBoss.name, kazan: BALANCE.kazan.name };
    const keys = new Set(SPRITES.map((s) => s.key));
    for (const b of INTRO_BOSSES) {
      const i = bossIntroInfo(b, 1);
      expect(i.name).toBe(names[b]);
      expect(i.subtitle).toBe('Коло 2');
      expect(keys.has(i.sprite), i.sprite).toBe(true);
      expect(TRACKS[i.music], i.music).toBeDefined();
    }
  });

  test('мелодія своя для кожного, одноразова, ~2 с', () => {
    const music = INTRO_BOSSES.map((b) => bossIntroInfo(b).music);
    expect(new Set(music).size).toBe(INTRO_BOSSES.length);
    for (const m of music) {
      const t = TRACKS[m];
      expect(t.loop, m).toBe(false);
      const sec = trackSteps(t) / ((t.bpm / 60) * 4);
      expect(sec, m).toBeGreaterThanOrEqual(1.5);
      expect(sec, m).toBeLessThanOrEqual(2.5);
    }
  });

  test('пропустити — після 1 с, саме закривається на 2,5 с', () => {
    expect(introCanSkip(999)).toBe(false);
    expect(introCanSkip(1000)).toBe(true);
    expect(introDone(2499)).toBe(false);
    expect(introDone(2500)).toBe(true);
  });
});
