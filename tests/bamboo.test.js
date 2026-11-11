import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import { lanternShouldArm, ninjaDodgeWindow, ninjaVulnerable, ninjaY } from '../src/systems/Bamboo.js';
import { ninjaInterval } from '../src/systems/WallWalkers.js';
import { spikeBand } from '../src/systems/SpikePlanner.js';

const N = BALANCE.enemies.ninja;

describe('ніндзя', () => {
  test('висота — у верхній частині екрана, далеко над слизаком', () => {
    const h = 1280;
    expect(ninjaY(() => 0, h)).toBeCloseTo(h * N.minYFrac);
    expect(ninjaY(() => 0.999, h)).toBeLessThan(h * N.maxYFrac);
    expect(h * N.maxYFrac).toBeLessThan(h * BALANCE.playerYRatio - BALANCE.jumpArcPx * BALANCE.holdArcMul - BALANCE.playerSize);
  });

  test('вікно ухилення — навколо прильоту сюрикена', () => {
    const arrive = N.smokeMs / 1000 + 520 / N.shurikenSpeed;
    expect(ninjaDodgeWindow(520)).toEqual({ fromSec: arrive - N.dodgeLeadSec, toSec: arrive + N.dodgeSec });
    expect(ninjaDodgeWindow(0).fromSec).toBe(0); // не в минулому
  });

  test('відрізок світу, який гравець пройде у вікні, з запасом', () => {
    const scroll = 300;
    const iv = ninjaInterval({ d0: 5000, zoneY: 896, scroll, fromSec: 2, toSec: 3 });
    const margin = BALANCE.playerSize / 2 + spikeBand(scroll);
    expect(iv.from).toBeCloseTo(5000 + scroll * 2 - 896 - margin);
    expect(iv.to).toBeCloseTo(5000 + scroll * 3 - 896 + margin);
  });

  test('уразливий лише з другої половини диму', () => {
    expect(ninjaVulnerable(0)).toBe(false);
    expect(ninjaVulnerable(N.smokeMs / 2)).toBe(true);
  });
});

describe('ліхтарик', () => {
  test('займається ближче за armPx', () => {
    expect(lanternShouldArm(89)).toBe(true);
    expect(lanternShouldArm(91)).toBe(false);
  });
  test('радіус вибуху менший за ширину коридору: від нього рятує стрибок', () => {
    expect(BALANCE.enemies.lantern.radiusPx * 2).toBeLessThan(720 - 2 * BALANCE.wallWidth - BALANCE.playerSize);
  });
});
