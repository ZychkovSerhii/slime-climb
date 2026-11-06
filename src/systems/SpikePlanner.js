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
