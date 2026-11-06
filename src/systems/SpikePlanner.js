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
  return minSpikeGap(scrollPxPerSec);
}

/**
 * Стан планувальника у «світових» координатах: w — пройдена відстань (distancePx),
 * на якій шип з'являється над верхнім краєм екрана.
 */
export function createSpikeState(startWorld, rng) {
  return {
    next: { left: startWorld, right: startWorld + spikeBand(BALANCE.scrollBase) * (1 + rng()) },
    lastW: -Infinity,
  };
}

/**
 * Шипи, що мають з'явитися до відстані distancePx, у порядку появи: [{ side, w }].
 * Сусідні шипи (будь-яких стін) розділені щонайменше spikeBand; на одній стіні — 1×…2× band.
 */
export function planSpikes(state, distancePx, scrollPxPerSec, rng) {
  const next = { ...state.next };
  let lastW = state.lastW;
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
    spikes.push({ side, w });
    lastW = w;
    next[side] = w + nextSpikeGap(scrollPxPerSec, rng);
  }
  return { state: { next, lastW }, spikes };
}
