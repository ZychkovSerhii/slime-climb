// Чиста логіка нагороди за рекламу (фідбек-7). Без Phaser. Режим і числа — у config/ads.js.
import { AD_MODE, REWARD_COOLDOWN_MS, REWARD_STEPS } from '../config/ads.js';

/** Скільки мс лишилось до наступної нагороди. Час останнього перегляду з майбутнього не блокує. */
export function rewardCooldownLeftMs(meta, nowMs) {
  const last = meta.adAt ?? 0;
  if (!(last > 0) || last > nowMs) return 0;
  return Math.max(0, last + REWARD_COOLDOWN_MS - nowMs);
}

/** Чи можна зараз показати рекламу за Шаги: реклама ввімкнена і кулдаун минув. */
export function canWatchRewarded(meta, nowMs, mode = AD_MODE) {
  return mode !== 'off' && rewardCooldownLeftMs(meta, nowMs) === 0;
}

/** Нова meta після переглянутої реклами: +REWARD_STEPS Шагів, adAt = nowMs. */
export function grantReward(meta, nowMs) {
  return { ...meta, steps: meta.steps + REWARD_STEPS, adAt: nowMs };
}
