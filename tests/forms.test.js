import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  abilityCharge, abilityReady, activeForms, canOfferHalfblood, formAbilities, hasForm, rideHit, rideZigzag, useAbility,
} from '../src/systems/Forms.js';
import { availableCards, createProgression } from '../src/systems/Progression.js';
import { formSkin } from '../src/systems/ShkodkoLoot.js';

const prog = (relics, halfblood = 0) => ({ ...createProgression(), relics, picks: { halfblood } });

describe('трансформації й «Полукровка» (фідбек-8)', () => {
  test('без «Полукровки» діє остання взята, з нею — усі', () => {
    expect(activeForms(['form', 'iam'], false)).toEqual(['iam']);
    expect(activeForms(['iam', 'oksana', 'form'], true)).toEqual(['form', 'iam']);
    expect(hasForm(prog(['form', 'iam']), 'form')).toBe(false);
    expect(hasForm(prog(['form', 'iam'], 1), 'form')).toBe(true);
    expect(formSkin(['form', 'iam'])).toBe('slimeShkodko'); // скін — останньої взятої
  });

  test('кнопки: павук — рій, Шкодько — потяг, Коля — клони, у Казана кнопки немає', () => {
    expect(formAbilities(prog(['form']))).toEqual(['swarm']);
    expect(formAbilities(prog(['iamkazan']))).toEqual([]);
    expect(formAbilities(prog(['iamkolya', 'form', 'iam', 'iamkazan'], 1))).toEqual(['swarm', 'train', 'clones']);
  });

  test('«Полукровка» в пулі лише з трансформацією і лише раз', () => {
    expect(canOfferHalfblood(prog([]))).toBe(false);
    expect(availableCards(prog(['venom']))).not.toContain('halfblood');
    expect(availableCards(prog(['form']))).toContain('halfblood');
    expect(availableCards(prog(['form'], 1))).not.toContain('halfblood');
  });

  test('перезарядка 60 с на кожну кнопку окремо', () => {
    let cd = {};
    expect(abilityReady(cd, 'swarm', 0)).toBe(true);
    cd = useAbility(cd, 'swarm', 1000);
    expect(abilityReady(cd, 'swarm', 30000)).toBe(false);
    expect(abilityReady(cd, 'train', 30000)).toBe(true);
    expect(useAbility(cd, 'swarm', 30000)).toBe(cd); // не готова — стан той самий
    expect(abilityCharge(cd, 'swarm', 31000)).toBeCloseTo(0.5);
    expect(abilityReady(cd, 'swarm', 1000 + BALANCE.forms.cdMs)).toBe(true);
  });

  test('потяг: дрібних ваншотить, боса й частини боса — з перезарядкою', () => {
    expect(rideHit({ isBoss: false, type: 'lion' }, undefined, 0)).toBe('kill');
    expect(rideHit({ isBoss: false, type: 'bearAura' }, undefined, 0)).toBe('boss');
    expect(rideHit({ isBoss: true, type: 'kazan' }, 0, 100)).toBe(null);
    expect(rideHit({ isBoss: true, type: 'kazan' }, 0, BALANCE.forms.train.bossHitCdMs)).toBe('boss');
  });

  test('шлях потяга: від стіни до стіни, не нижче гравця, досить довгий на всю поїздку', () => {
    const pts = rideZigzag(100, 600, 200, 900, 150, 7000);
    expect(pts[0]).toEqual({ x: 100, y: 200 });
    expect(Math.max(...pts.map((p) => p.y))).toBeLessThanOrEqual(900);
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    expect(len).toBeGreaterThanOrEqual(7000);
    expect(pts.every((p) => p.x === 100 || p.x === 600)).toBe(true);
  });
});
