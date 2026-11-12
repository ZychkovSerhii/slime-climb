import { describe, expect, test } from 'vitest';
import { BALANCE } from '../src/config/balance.js';
import {
  achievementList,
  buySkin,
  claimAchievement,
  emptyMeta,
  equipSkin,
  loadMeta,
  normalizeMeta,
  recordKill,
  saveMeta,
  skinSprite,
  stepsForKill,
  unclaimedCount,
} from '../src/systems/Meta.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}
const throwingStorage = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('denied');
  },
};

const killN = (meta, type, n) => {
  let r = { meta, unlocked: [] };
  const all = [];
  for (let i = 0; i < n; i++) {
    r = recordKill(r.meta, type);
    all.push(...r.unlocked);
  }
  return { meta: r.meta, unlocked: all };
};

describe('сховище', () => {
  test('новий гравець: 0 Шагів, лише базовий слизак', () => {
    expect(loadMeta(memoryStorage())).toEqual(emptyMeta());
  });

  test('зберегти й прочитати — той самий стан', () => {
    const st = memoryStorage();
    const m = killN(emptyMeta(), 'boss', 1).meta;
    expect(saveMeta(st, m)).toBe(true);
    expect(loadMeta(st)).toEqual(m);
  });

  test('зламане сховище: не кидає, стан нового гравця', () => {
    expect(loadMeta(throwingStorage)).toEqual(emptyMeta());
    expect(saveMeta(throwingStorage, emptyMeta())).toBe(false);
    expect(loadMeta(undefined)).toEqual(emptyMeta());
    expect(loadMeta(memoryStorage({ 'slime-climb.meta': '{не json' }))).toEqual(emptyMeta());
  });

  test('сміття і підробки відкидаються', () => {
    const m = normalizeMeta({
      steps: -5,
      owned: ['raccoon', 'dragon', 'raccoon'],
      skin: 'murzik',
      kills: { lion: 3, bat: 'багато', plant: 1.5 },
      achievements: { boss1: { claimed: true }, fake: { claimed: false } },
    });
    expect(m.steps).toBe(0);
    expect(m.owned).toEqual(['slime', 'raccoon']);
    expect(m.skin).toBe('slime'); // murzik не куплений
    expect(m.kills).toEqual({ lion: 3 });
    expect(m.achievements).toEqual({ boss1: { claimed: true } });
  });
});

describe('Шаги за вбивства', () => {
  test('павучиха 60, дрібні 1–2, павучки рою — 0', () => {
    expect(stepsForKill('boss')).toBe(60);
    for (const t of ['lion', 'bat', 'plant']) expect(stepsForKill(t)).toBeGreaterThanOrEqual(1);
    expect(stepsForKill('smallSpider')).toBe(0);
    expect(stepsForKill('невідомий')).toBe(0);
  });

  test('вбивство додає Шаги й лічильник, не міняючи старий стан', () => {
    const m0 = emptyMeta();
    const r = recordKill(m0, 'lion');
    expect(r.meta.steps).toBe(stepsForKill('lion'));
    expect(r.meta.kills.lion).toBe(1);
    expect(m0.steps).toBe(0);
    expect(m0.kills).toEqual({});
  });
});

describe('досягнення', () => {
  test('приховані, доки не отримані', () => {
    const list = achievementList(emptyMeta());
    expect(list).toHaveLength(BALANCE.meta.achievements.length);
    for (const a of list) {
      expect(a.hidden).toBe(true);
      expect(a.title).toBeUndefined();
      expect(a.caption).toBeUndefined();
    }
  });

  test('перше вбивство павучихи відкриває «Вбивство Мамаши» рівно один раз', () => {
    const r1 = recordKill(emptyMeta(), 'boss');
    expect(r1.unlocked.map((a) => a.id)).toEqual(['boss1']);
    const r2 = recordKill(r1.meta, 'boss');
    expect(r2.unlocked).toEqual([]);
    const shown = achievementList(r2.meta).find((a) => a.id === 'boss1');
    expect(shown).toMatchObject({ hidden: false, title: 'Вбивство Мамаши', claimed: false });
  });

  test('5 павучих і 50 левів — на п\'ятій і п\'ятдесятій', () => {
    expect(killN(emptyMeta(), 'boss', 4).unlocked.map((a) => a.id)).toEqual(['boss1']);
    expect(killN(emptyMeta(), 'boss', 5).unlocked.map((a) => a.id)).toEqual(['boss1', 'boss5']);
    expect(killN(emptyMeta(), 'lion', 49).unlocked).toEqual([]);
    expect(killN(emptyMeta(), 'lion', 50).unlocked.map((a) => a.id)).toEqual(['lion50']);
  });

  test('нагорода забирається один раз', () => {
    const m = killN(emptyMeta(), 'boss', 1).meta;
    expect(unclaimedCount(m)).toBe(1);
    const c1 = claimAchievement(m, 'boss1');
    expect(c1.reward).toBe(100);
    expect(c1.meta.steps).toBe(m.steps + 100);
    expect(unclaimedCount(c1.meta)).toBe(0);
    expect(claimAchievement(c1.meta, 'boss1').reward).toBe(0);
    expect(claimAchievement(m, 'lion50').reward).toBe(0); // ще не отримане
  });
});

describe('магазин', () => {
  const rich = { ...emptyMeta(), steps: 1000 };

  test('купівля знімає Шаги і вдягає скін', () => {
    const r = buySkin(rich, 'raccoon');
    expect(r.ok).toBe(true);
    expect(r.meta.steps).toBe(500);
    expect(r.meta.owned).toContain('raccoon');
    expect(skinSprite(r.meta)).toBe('skinRaccoon');
  });

  test('не вистачає Шагів / уже куплено / невідомий', () => {
    expect(buySkin({ ...emptyMeta(), steps: 299 }, 'assassin')).toMatchObject({ ok: false, reason: 'poor' });
    const owned = buySkin(rich, 'assassin').meta;
    expect(buySkin(owned, 'assassin')).toMatchObject({ ok: false, reason: 'owned' });
    expect(buySkin(rich, 'dragon')).toMatchObject({ ok: false, reason: 'unknown' });
  });

  test('вдягнути можна лише куплене', () => {
    expect(equipSkin(emptyMeta(), 'murzik').skin).toBe('slime');
    const m = buySkin(rich, 'assassin').meta;
    expect(equipSkin(m, 'slime').skin).toBe('slime');
    expect(equipSkin(equipSkin(m, 'slime'), 'assassin').skin).toBe('assassin');
  });

  test('ціни зі специфікації', () => {
    const price = Object.fromEntries(BALANCE.meta.skins.map((s) => [s.id, s.price]));
    expect(price).toEqual({ slime: 0, assassin: 300, commander: 300, raccoon: 500, murzik: 1000 });
  });
});

describe('спрайти скінів', async () => {
  const { SPRITES } = await import('../src/art/sprites/index.js');
  const slime = SPRITES.find((s) => s.key === 'slime');
  test.each(BALANCE.meta.skins)('$id: спрайт є, той самий розмір, анімації idle/jump', (skin) => {
    const sp = SPRITES.find((s) => s.key === skin.sprite);
    expect(sp).toBeDefined();
    expect([sp.w, sp.h]).toEqual([slime.w, slime.h]); // від розміру залежить хітбокс
    expect(Object.keys(sp.anims)).toEqual(expect.arrayContaining(['idle', 'jump']));
  });
});

test('Коля: 120 Шагів, досягнення 200 і 500; уламки Шагів не дають', async () => {
  const { emptyMeta, recordKill, stepsForKill } = await import('../src/systems/Meta.js');
  expect(stepsForKill('kolya')).toBe(120);
  expect(stepsForKill('kolyaPart')).toBe(0);
  let m = emptyMeta();
  const r = recordKill(m, 'kolya');
  expect(r.unlocked.map((a) => [a.id, a.reward])).toEqual([['kolya1', 200]]);
  m = r.meta;
  for (let i = 0; i < 3; i++) m = recordKill(m, 'kolya').meta;
  expect(recordKill(m, 'kolya').unlocked.map((a) => [a.id, a.reward])).toEqual([['kolya5', 500]]);
});

test('етап 11: Казан — 150 Шагів, досягнення 250 і 600; 50 саламандр і 50 іскор', async () => {
  const { emptyMeta, recordKill, stepsForKill } = await import('../src/systems/Meta.js');
  expect(stepsForKill('kazan')).toBe(150);
  let m = emptyMeta();
  const r = recordKill(m, 'kazan');
  expect(r.unlocked.map((a) => [a.id, a.reward])).toEqual([['kazan1', 250]]);
  m = r.meta;
  for (let i = 0; i < 3; i++) m = recordKill(m, 'kazan').meta;
  expect(recordKill(m, 'kazan').unlocked.map((a) => [a.id, a.reward])).toEqual([['kazan5', 600]]);
  let s = emptyMeta();
  for (let i = 0; i < 49; i++) s = recordKill(s, 'salamander').meta;
  expect(recordKill(s, 'salamander').unlocked.map((a) => a.id)).toEqual(['salamander50']);
  let k = emptyMeta();
  for (let i = 0; i < 49; i++) k = recordKill(k, 'spark').meta;
  expect(recordKill(k, 'spark').unlocked.map((a) => a.id)).toEqual(['spark50']);
});
