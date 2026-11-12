// Лавові надра (етап 11, §11.2): саламандра, іскра, лавова крапля. Чисті функції без Phaser.
import { BALANCE } from '../config/balance.js';
import { otherSide } from './WallWalkers.js';

const S = BALANCE.enemies.salamander;
const SP = BALANCE.enemies.spark;
const D = BALANCE.lava.drop;
const T = BALANCE.traits;

/** Таймлайн саламандри (мс від появи). enhanced — коло ≥ 1: видихів T.salamander.breaths з паузою gapMs. */
export function salamanderTimeline(enhanced) {
  return {
    emergeMs: S.emergeMs,
    warnMs: S.warnMs,
    breathMs: S.breathMs,
    breaths: enhanced ? T.salamander.breaths : 1,
    gapMs: enhanced ? T.salamander.gapMs : 0,
    hideMs: S.hideMs,
  };
}

/** Пільга після приземлення: струмінь чекає, поки гравець простоїть на стіні landGraceMs. */
export function beamCanFire(sinceLandMs) {
  return sinceLandMs >= S.landGraceMs;
}

/** Чи дихне саламандра: killedAtMs — мс від появи до смерті (null — жива). Убита до кінця лінії — ні. */
export function salamanderFires(killedAtMs, tl) {
  return killedAtMs === null || killedAtMs >= tl.emergeMs + tl.warnMs;
}

/** Струмінь — горизонтальна смуга висотою 2·beamHalfH через увесь коридор: б'є, якщо перетинає гравця по y. */
export function beamHits(playerY, beamY) {
  return Math.abs(playerY - beamY) <= S.beamHalfH + BALANCE.playerSize / 2;
}

/**
 * Коли гравцю потрібна стіна саламандри (секунди від появи): від струменя рятує стрибок, а приземлення —
 * на стіні саламандри. Як ninjaDodgeWindow: на ній не має бути шипів від (лінія − dodgeSec) до кінця видихів + dodgeSec.
 */
export function salamanderDodgeWindow(enhanced) {
  const tl = salamanderTimeline(enhanced);
  const fire = (tl.emergeMs + tl.warnMs) / 1000;
  const last = fire + (tl.breaths * tl.breathMs + (tl.breaths - 1) * tl.gapMs) / 1000;
  return { fromSec: Math.max(fire - S.dodgeSec, 0), toSec: last + S.dodgeSec };
}

/** На скільки дрібних розпадається іскра: 2 (посилена — 3), але дрібних на екрані не більше maxSmall. */
export function sparkSplit(enhanced, aliveSmall) {
  const n = enhanced ? T.spark.splits : SP.splits;
  return Math.max(0, Math.min(n, SP.maxSmall - aliveSmall));
}

/** Під час бою з Казаном краплі не падають (лава Казана й так займає стіни). */
export function dropsAllowed(bossActive) {
  return !bossActive;
}

/**
 * Коли крапля проходить повз гравця (секунди від появи): після набухання стікає від верху екрана (y = 0)
 * до playerY зі швидкістю D.speed. Запас — розмір гравця в обидва боки.
 */
export function dropPassWindow(playerY) {
  const arrive = D.swellMs / 1000 + playerY / D.speed;
  const margin = BALANCE.playerSize / D.speed + 0.3;
  return { fromSec: Math.max(arrive - margin, 0), toSec: arrive + margin };
}

/**
 * Стіна для краплі. blocked — { left, right }: чи є на стіні шипи у вікні проходу. Крапля на X займає X,
 * тож протилежна стіна мусить бути вільною. Обидві вільні — випадково; жодна — null (краплі не буде).
 */
export function dropSide(rng, blocked) {
  const ok = ['left', 'right'].filter((side) => !blocked[otherSide(side)]);
  if (ok.length === 0) return null;
  if (ok.length === 1) return ok[0];
  return rng() < 0.5 ? 'left' : 'right';
}

/** Затримка до наступної краплі: everyMs ± jitter. */
export function nextDropMs(rng) {
  return D.everyMs * (1 - D.jitter + 2 * D.jitter * rng());
}

/** Чи б'є струмінь зараз: у стрибку — ні (від струменя рятує стрибок), на стіні — якщо на висоті смуги. */
export function beamDanger(playerY, beamY, isJumping) {
  return !isJumping && beamHits(playerY, beamY);
}

/**
 * Чи можна почати видих (і кожен наступний): гравець стоїть на стіні щонайменше landGraceMs.
 * Тоді стрибок, почавши його з видихом, переносить гравця через увесь струмінь (breathMs < стрибка),
 * а б'є лише приземлення під час видиху.
 */
export function salamanderMayFire(isJumping, sinceLandMs) {
  return !isJumping && beamCanFire(sinceLandMs);
}
