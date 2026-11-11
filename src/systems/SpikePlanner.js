import { BALANCE } from '../config/balance.js';

/**
 * Мінімальна відстань між шипами на одній стіні (px).
 * Правило чесності: поки слизак летить (jumpDurationMs), світ зсувається на scroll*t;
 * плюс розмір слизака і шипа — тож місце приземлення не може опинитися між двома шипами впритул.
 */
export function minSpikeGap(scrollPxPerSec) {
  return (scrollPxPerSec * BALANCE.jumpDurationMs) / 1000 + BALANCE.playerSize + BALANCE.spikeHeight;
}

/** Наступний проміжок: від 1× до 2× мінімуму. rng повертає [0, 1). */
export function nextSpikeGap(scrollPxPerSec, rng) {
  return minSpikeGap(scrollPxPerSec) * (1 + rng());
}

/**
 * Мінімальна відстань між будь-якими двома сусідніми шипами — на одній стіні чи на протилежних.
 * Якщо шипи на двох стінах ідуть майже на одній висоті, гравця зачепить незалежно від тапу:
 * стрибок не встигає «проскочити» між ними. Тож обидві стіни плануються разом.
 */
export function spikeBand(scrollPxPerSec) {
  // плюс запас на реакцію: мінімум «впритул» проходить лише ідеальний гравець без затримок
  return minSpikeGap(scrollPxPerSec) + scrollPxPerSec * BALANCE.spikeSlackSec;
}

/**
 * Стан планувальника у «світових» координатах: w — пройдена відстань (distancePx),
 * на якій шип з'являється над верхнім краєм екрана.
 */
export function createSpikeState(startWorld, rng) {
  return {
    next: { left: startWorld, right: startWorld + spikeBand(BALANCE.scrollBase) * (1 + rng()) },
    lastW: -Infinity,
    // перша гребінка — не раніше ніж через minGapSec від старту
    lastCombW: startWorld,
    // фідбек-3: проміжки світу без шипів на стіні side ([{ side, from, to }], центри) — для ходоків по стінах
    free: [],
  };
}

/**
 * Резерв: на стіні side у світі [from, to] шипів не буде (центри; шип займає [w, w + spikeHeight]).
 * Старі резерви, які вже давно під екраном, відкидаються.
 */
export function reserveFree(state, side, from, to, distancePx = -Infinity, id = null) {
  // id — резерв з тим самим id замінюється (ходок у черзі щокадру уточнює свій); from > to — зняти резерв
  const keep = (state.free ?? []).filter((f) => f.to >= distancePx - 2000 && (id === null || f.id !== id));
  return { ...state, free: from <= to ? [...keep, { side, from, to, id }] : keep };
}

/** Резерв, у який потрапляє відрізок світу [lo, hi] на стіні side, або undefined. */
function blockedBy(free, side, lo, hi) {
  return free.find((f) => f.side === side && hi >= f.from && lo <= f.to);
}

/**
 * «Гребінка»: count шипів впритул на стіні side, починаючи з w. Для правил проміжків уся гребінка —
 * як один довгий шип: перед нею і після неї — щонайменше band, а протилежна стіна вільна на весь її час.
 */
function combSpikes(side, w, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ side, w: w + i * BALANCE.spikeHeight, comb: true });
  return out;
}

/**
 * Шипи, що мають з'явитися до відстані distancePx, у порядку появи: [{ side, w }].
 * Сусідні шипи (будь-яких стін) розділені щонайменше spikeBand; на одній стіні — 1×…2× band.
 */
export function planSpikes(state, distancePx, scrollPxPerSec, rng, { combChance = BALANCE.spikeComb.chance } = {}) {
  const next = { ...state.next };
  let lastW = state.lastW;
  let lastCombW = state.lastCombW ?? -Infinity;
  const free = state.free ?? [];
  const S = BALANCE.spikeHeight;
  const C = BALANCE.spikeComb;
  const band = spikeBand(scrollPxPerSec);
  const spikes = [];
  for (;;) {
    const side = next.left <= next.right ? 'left' : 'right';
    let w = next[side];
    if (w > distancePx) break;
    if (w < lastW + band) {
      // занадто близько до попереднього шипа (найімовірніше на іншій стіні) — відсуваємо.
      // Порівнюємо з тим самим виразом lastW + band, тож після зсуву умова гарантовано хибна.
      next[side] = lastW + band;
      continue;
    }
    const reserved = blockedBy(free, side, w, w + S);
    if (reserved) {
      // стіна зарезервована під ходока на протилежній стіні — перший шип після резерву
      next[side] = reserved.to + 1;
      continue;
    }
    const other = side === 'left' ? 'right' : 'left';
    const combMax = w + C.maxCount * S;
    if (!blockedBy(free, side, w, combMax) && w - lastCombW >= C.minGapSec * scrollPxPerSec && rng() < combChance) {
      const count = C.minCount + Math.floor(rng() * (C.maxCount - C.minCount + 1));
      const comb = combSpikes(side, w, count);
      spikes.push(...comb);
      lastW = comb[comb.length - 1].w;
      lastCombW = lastW;
      // протилежна стіна вільна від початку гребінки до її кінця + band
      next[other] = Math.max(next[other], lastW + band);
      next[side] = lastW + nextSpikeGap(scrollPxPerSec, rng);
      continue;
    }
    spikes.push({ side, w });
    lastW = w;
    next[side] = w + nextSpikeGap(scrollPxPerSec, rng);
  }
  return { state: { next, lastW, lastCombW, free }, spikes };
}

/**
 * Пропуск шипів до відстані distancePx (біля боса шипів немає): нічого не ставить,
 * лише відсуває план, тож після паузи шипи знову йдуть з-над екрана по одному, а не пачкою.
 */
export function skipSpikes(state, distancePx, scrollPxPerSec, rng) {
  const next = { ...state.next };
  if (next.left < distancePx && next.right < distancePx) {
    // обидві стіни «прострочені»: одна починає з поточної відстані, друга — щонайменше через band
    const first = rng() < 0.5 ? 'left' : 'right';
    const second = first === 'left' ? 'right' : 'left';
    next[first] = distancePx;
    next[second] = distancePx + spikeBand(scrollPxPerSec) * (1 + rng());
  } else {
    next.left = Math.max(next.left, distancePx);
    next.right = Math.max(next.right, distancePx);
  }
  return { ...state, next };
}

/**
 * Світова координата, з якої починати планування, щоб на старті екран уже був заповнений шипами,
 * а найнижчий з них дійшов до гравця (playerY) через spikeLeadSec на стартовій швидкості.
 */
export function prefillStartWorld(distancePx, playerY) {
  const zoneTop = playerY - (BALANCE.playerSize + BALANCE.spikeHeight) / 2;
  const lowestY = zoneTop - BALANCE.spikeLeadSec * BALANCE.scrollBase;
  return distancePx - (lowestY + BALANCE.spikeHeight / 2);
}
