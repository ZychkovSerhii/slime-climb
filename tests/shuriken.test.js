import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { orbitDamage, orbitPoints, shurikenStats } from '../src/systems/Skills.js';
import { availableCards, applyCard, createProgression } from '../src/systems/Progression.js';
import { cardText } from '../src/systems/CardText.js';

const R = BALANCE.skills.shuriken;

describe('сюрикени (фідбек-6 п.8)', () => {
  test('без взять кільця немає', () => {
    expect(shurikenStats(0).count).toBe(0);
  });
  test('кількість, шкода й радіус ростуть зі взяттями й упираються в maxPicks', () => {
    const all = Array.from({ length: R.maxPicks }, (_, i) => shurikenStats(i + 1));
    for (let i = 1; i < all.length; i++) {
      expect(all[i].count).toBeGreaterThanOrEqual(all[i - 1].count);
      expect(all[i].damage).toBeGreaterThan(all[i - 1].damage);
      expect(all[i].radius).toBeGreaterThan(all[i - 1].radius);
    }
    expect(shurikenStats(R.maxPicks + 3)).toEqual(shurikenStats(R.maxPicks));
  });
  test('точки рівномірно на колі й обертаються з часом', () => {
    const p = orbitPoints(100, 200, 4, 50, 0);
    for (const q of p) expect(Math.hypot(q.x - 100, q.y - 200)).toBeCloseTo(50);
    expect(Math.hypot(p[0].x - p[2].x, p[0].y - p[2].y)).toBeCloseTo(100);
    const later = orbitPoints(100, 200, 4, 50, 300);
    expect(later[0].x).not.toBeCloseTo(p[0].x);
  });
  test('боса ріже слабше, біом посилює', () => {
    expect(orbitDamage(2, 1, true)).toBe(2 * R.bossMul);
    expect(orbitDamage(2, 1.15, false)).toBeCloseTo(2.3);
  });
  test('картка доступна до maxPicks і має текст', () => {
    let p = createProgression();
    for (let i = 0; i < R.maxPicks; i++) {
      expect(availableCards(p)).toContain('shuriken');
      expect(cardText('shuriken', p.picks, p.arsenal).desc).toMatch(/шкоди/);
      p = applyCard(p, 'shuriken');
    }
    expect(availableCards(p)).not.toContain('shuriken');
  });
});
