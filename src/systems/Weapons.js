import { BALANCE } from '../config/balance.js';

// Чиста логіка атак основної зброї (етап 4a). main — id зброї з BALANCE.weapons або null (стартовий постріл).

const U = BALANCE.weaponUpgrades;

/** Приріст шкоди за одну прокачку: спільний damageAdd або свій у зброї (дробовик — менший, бо куль кілька). */
export function weaponDamageAdd(main) {
  return U[main]?.damageAdd ?? U.damageAdd;
}

/**
 * Шкода одного удару: поточна шкода пострілу (база + «Урон») × множник зброї
 * + damageAdd за кожну прокачку основної зброї (фідбек-2).
 */
export function attackDamage(main, baseDamage, upgrades = 0) {
  const add = main ? weaponDamageAdd(main) * upgrades : 0;
  return baseDamage * (BALANCE.weapons[main]?.damageMul ?? 1) + add;
}

/** Множник швидкості стрибка від зброї (Ворота чакри — швидші стрибки). */
export function weaponJumpMul(main) {
  return BALANCE.weapons[main]?.jumpSpeedMul ?? 1;
}

/** Радіус розмаху сокири для ширини екрана width. */
export function axeRadius(width, upgrades = 0) {
  return Math.min(width * BALANCE.weapons.axe.radiusFrac * U.axe.radiusStep ** upgrades, width * U.axe.radiusMaxFrac);
}

/** Вигляд сокири (етап 10): індекс кадру 0…4 за прокачками (U.axe.tiers). */
export function axeTier(upgrades = 0) {
  let t = 0;
  U.axe.tiers.forEach((from, i) => {
    if (upgrades >= from) t = i;
  });
  return t;
}

/** Інтервал після прокачок: прокачки не опускають його нижче minFireIntervalMs (етап 10); якщо без них уже нижче — як є. */
function capped(ms, upMul) {
  return Math.max(ms * upMul, Math.min(ms, BALANCE.minFireIntervalMs));
}

/** Чи з'явилась міні-сокира-помічниця (прокачка сокири до miniAxeAt). */
export function hasMiniAxe(main, upgrades) {
  return main === 'axe' && upgrades >= U.axe.miniAxeAt;
}

/** Розмір черги чакри з урахуванням прокачки. */
export function chakraBurst(upgrades = 0) {
  return BALANCE.weapons.chakra.burst + (upgrades >= U.chakra.extraAt ? U.chakra.extraBurst : 0);
}

/** Множник інтервалу атаки від прокачки основної зброї (<1 — частіше). */
export function upgradeIntervalMul(main, upgrades = 0) {
  if (!upgrades) return 1;
  if (main === 'axe') return U.axe.intervalStep ** upgrades;
  if (U[main]?.speedStep) return 1 / U[main].speedStep ** upgrades; // дробовик, чакра, етап 14
  return 1;
}

// ---------- Етап 14: блискавка, вогонь, бумеранг, рикошет дробовика ----------

/** Скільки ворогів б'є ланцюг блискавки і що відкрито на рівні upgrades. */
export function lightningStats(upgrades = 0) {
  const L = U.lightning;
  return {
    targets: BALANCE.weapons.lightning.targets + L.moreAt.filter((at) => upgrades >= at).length,
    stun: upgrades >= L.stunAt,
    blast: upgrades >= L.blastAt,
  };
}

/**
 * Ланцюг блискавки: перша ціль first, далі щоразу найближчий ще не вражений до chainPx від попереднього.
 * Не більше max цілей. Повертає масив цілей по порядку.
 */
export function chainTargets(first, targets, max, chainPx = BALANCE.weapons.lightning.chainPx) {
  const out = [first];
  const left = targets.filter((t) => t !== first);
  while (out.length < max && left.length) {
    const last = out[out.length - 1];
    let best = -1;
    let bestD = chainPx * chainPx;
    left.forEach((t, i) => {
      const d = (t.x - last.x) ** 2 + (t.y - last.y) ** 2;
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best < 0) break;
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

/** Шкода i-го (з 0) удару ланцюга: кожен перескок слабший у falloff раз. */
export function chainDamage(damage, i) {
  return damage * BALANCE.weapons.lightning.falloff ** i;
}

/** Горіння вогняного жезла від удару damage: { dps, durationMs } + що відкрито (spread, explode). */
export function burnStats(damage, upgrades = 0) {
  const F = BALANCE.weapons.fire;
  const A = U.fire;
  return {
    dps: damage * F.burnMul * (1 + A.burnStep * upgrades),
    durationMs: F.burnMs + A.burnMsStep * upgrades,
    spread: upgrades >= A.spreadAt,
    explode: upgrades >= A.explodeAt,
  };
}

/** Горіння, перекинуте на сусіда: слабше в spreadMul раз (правка 2026-11-18 — додаткові цілі слабші за основну). */
export function spreadBurn(burn) {
  return { ...burn, dps: burn.dps * U.fire.spreadMul };
}

/** Шкода бумеранга i-му (з 0) ворогу за прохід: перший ×1, решта ×pierceMul. */
export function pierceDamage(damage, i) {
  return i === 0 ? damage : damage * BALANCE.weapons.boomerang.pierceMul;
}

/** Бумеранг на рівні upgrades: дальність (зі стелею), кількість і щит. */
export function boomerangStats(upgrades = 0) {
  const B = BALANCE.weapons.boomerang;
  const A = U.boomerang;
  return {
    rangePx: Math.min(B.rangePx * A.rangeStep ** upgrades, A.rangeMaxPx),
    count: upgrades >= A.twinAt ? 2 : 1,
    shield: upgrades >= A.shieldAt,
  };
}

/**
 * Крок бумеранга на dt мс. state { x, y, angle, travelled, back }: туди — по прямій під angle, доки не пролетить
 * rangePx; назад — прямо на home (слизак там, де він зараз: гравець стрибає, бумеранг доганяє). Повертає новий стан
 * з done: true, коли долетів до home (ближче catchPx).
 */
export function stepBoomerang(state, dt, speed, rangePx, home, catchPx = 24) {
  const step = (speed * dt) / 1000;
  if (!state.back) {
    const travelled = Math.min(state.travelled + step, rangePx);
    const d = travelled - state.travelled;
    const next = { ...state, x: state.x + Math.cos(state.angle) * d, y: state.y + Math.sin(state.angle) * d, travelled };
    return { ...next, back: travelled >= rangePx, done: false };
  }
  const dx = home.x - state.x;
  const dy = home.y - state.y;
  const len = Math.hypot(dx, dy);
  if (len <= Math.max(step, catchPx)) return { ...state, x: home.x, y: home.y, done: true };
  return { ...state, x: state.x + (dx / len) * step, y: state.y + (dy / len) * step, done: false };
}

/** Чи рикошетять дробинки на цьому рівні дробовика. */
export function shotgunRicochet(upgrades = 0) {
  return upgrades >= U.shotgun.ricochetAt;
}

/**
 * Цілі, які зачіпає коло радіуса r навколо center. sizeOf(t) — «радіус» самої цілі:
 * великий бос потрапляє під удар краєм тіла, а не лише центром.
 */
export function inRadius(center, targets, r, sizeOf = () => 0) {
  return targets.filter((t) => {
    const reach = r + sizeOf(t);
    return (t.x - center.x) ** 2 + (t.y - center.y) ** 2 <= reach * reach;
  });
}

/** Кути куль дробовика (радіани): у ціль і дві під ±spreadDeg; з прокачки extraAt — ще дві під ±extraDeg. */
export function shotgunAngles(aim, upgrades = 0) {
  const d = (BALANCE.weapons.shotgun.spreadDeg * Math.PI) / 180;
  const out = [aim, aim + d, aim - d];
  if (upgrades >= U.shotgun.extraAt) {
    const e = (U.shotgun.extraDeg * Math.PI) / 180;
    out.push(aim + e, aim - e);
  }
  return out;
}

export function createFireState() {
  return { cooldownMs: 0, burstLeft: 0 };
}

/**
 * Крок таймера атаки. hasTarget — чи є в кого бити (для сокири — хтось у радіусі).
 * Повертає { state, fire }. Без цілі не атакуємо, але й не втрачаємо готовність:
 * атака — щойно ціль з'явиться. Черга чакри не губиться, якщо ціль на мить зникла.
 */
export function stepFire(state, dt, { main, fireIntervalMs, hasTarget, upgrades = 0 }) {
  const cooldownMs = Math.max(state.cooldownMs - dt, 0);
  if (cooldownMs > 0 || !hasTarget) return { state: { ...state, cooldownMs }, fire: false };
  const up = upgradeIntervalMul(main, upgrades);
  if (main === 'chakra') {
    const c = BALANCE.weapons.chakra;
    const burstLeft = (state.burstLeft > 0 ? state.burstLeft : chakraBurst(upgrades)) - 1;
    const next = burstLeft > 0 ? c.burstGapMs : capped(fireIntervalMs * c.reloadMul, up);
    return { state: { cooldownMs: next, burstLeft }, fire: true };
  }
  const mul = BALANCE.weapons[main]?.intervalMul ?? 1; // сокира й етап 14
  return { state: { cooldownMs: capped(fireIntervalMs * mul, up), burstLeft: 0 }, fire: true };
}
