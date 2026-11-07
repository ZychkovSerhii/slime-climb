import { BALANCE } from '../config/balance.js';

/** Обмежує тривалість кадру, щоб після повернення з фону об'єкти не «телепортувались». */
export function clampDelta(deltaMs) {
  return Math.min(Math.max(deltaMs, 0), BALANCE.maxDeltaMs);
}
