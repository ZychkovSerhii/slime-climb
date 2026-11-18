// Чиста логіка нагороди за рекламу (фідбек-7). Без Phaser. Режим і числа — у config/ads.js.
// Ліміту на частоту немає (рішення користувача 2026-11-18): дивись рекламу скільки хочеш.
import { AD_MODE, REWARD_STEPS } from '../config/ads.js';

/** Чи можна показати рекламу за Шаги: достатньо, щоб реклама була ввімкнена. */
export function canWatchRewarded(mode = AD_MODE) {
  return mode !== 'off';
}

/** Нова meta після переглянутої реклами: +REWARD_STEPS Шагів. */
export function grantReward(meta) {
  return { ...meta, steps: meta.steps + REWARD_STEPS };
}
