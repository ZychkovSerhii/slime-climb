// Туманний бамбук (етап 9, §9.1): ніндзя і ліхтарик-дух. Чисті функції без Phaser.
import { BALANCE } from '../config/balance.js';

const N = BALANCE.enemies.ninja;
const L = BALANCE.enemies.lantern;

/** Висота ніндзі на екрані: у [minYFrac, maxYFrac) висоти — завжди набагато вище за слизака. */
export function ninjaY(rng, height) {
  return height * (N.minYFrac + rng() * (N.maxYFrac - N.minYFrac));
}

/**
 * Коли гравцю потрібна стіна ніндзі (секунди від появи ніндзі): сюрикен вилітає після диму і летить dist;
 * ухилитися — за dodgeLeadSec до прильоту, перечекати — dodgeSec після. Повертає { fromSec, toSec }.
 */
export function ninjaDodgeWindow(dist) {
  const arrive = N.smokeMs / 1000 + dist / N.shurikenSpeed;
  return { fromSec: Math.max(arrive - N.dodgeLeadSec, 0), toSec: arrive + N.dodgeSec };
}

/** Ніндзя стає вразливим на другій половині диму: убив до кидка — кидка немає. */
export function ninjaVulnerable(sinceSpawnMs) {
  return sinceSpawnMs >= N.smokeMs / 2;
}

/** Ліхтарик «займається» (блимає, потім вибухає), коли гравець ближче за armPx. */
export function lanternShouldArm(dist) {
  return dist <= L.armPx;
}
