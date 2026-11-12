// Сердечко (етап 10, §10.5): +1 життя на одній зі стін. Розклад і вибір стіни без Phaser.
import { BALANCE } from '../config/balance.js';

const H = BALANCE.heart;

/** nextAt — секунда гри наступної появи; lastFight — бій, у якому сердечко вже було. */
export function createHeartState() {
  return { nextAt: H.firstSec, lastFight: null };
}

/**
 * Чи з'явитися сердечку на секунді tSec. livesFull — життя повні: сердечка немає, а наступна поява
 * тримається щонайменше на afterFullSec попереду. Інакше прострочений таймер спрацьовував у той самий
 * кадр, коли гравець втрачав життя (відгук після етапу 10).
 * fight — id поточного бою з босом чи ведмедем або null: за один бій — щонайбільше одне.
 */
export function heartDue(state, { tSec, livesFull, fight = null }, rng) {
  if (livesFull) {
    const hold = tSec + H.afterFullSec;
    return { state: hold > state.nextAt ? { ...state, nextAt: hold } : state, spawn: false };
  }
  if (tSec < state.nextAt) return { state, spawn: false };
  if (fight !== null && state.lastFight === fight) return { state, spawn: false };
  const nextAt = tSec + H.minSec + rng() * (H.maxSec - H.minSec);
  return { state: { nextAt, lastFight: fight ?? state.lastFight }, spawn: true };
}

/**
 * Стіна для сердечка на висоті y екрана: випадкова, але без шипа ближче spikeGapPx на ній. spikes — [{ side, y }].
 * Обидві зайняті — null (спробувати пізніше).
 */
export function heartSide(spikes, y, rng) {
  const free = (side) => !spikes.some((s) => s.side === side && Math.abs(s.y - y) < H.spikeGapPx);
  const first = rng() < 0.5 ? 'left' : 'right';
  const second = first === 'left' ? 'right' : 'left';
  if (free(first)) return first;
  return free(second) ? second : null;
}
