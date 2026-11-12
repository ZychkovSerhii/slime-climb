// Бос 4 «Пан Казан» (етап 11, §11.3): фази, виливання лави на стіни, кришка-бумеранг. Чисті функції без Phaser.
// Частки HP — від maxHp (з множником кола й «Складності»).
import { BALANCE } from '../config/balance.js';
import { otherSide } from './WallWalkers.js';

const K = BALANCE.kazan;

/** Фаза за часткою HP: 'p1' → 'boil' (раз) → 'p2' → 'rage-start' (раз) → 'rage'. Фази не відкочуються. */
export function kazanPhase(hpFrac, { boiled, raged }) {
  const EPS = 1e-9; // HP, що тримається рівно на порозі (kazanHpFloor), — уже поріг, попри похибку дробів
  if (raged) return 'rage';
  if (boiled) return hpFrac <= K.phases.rage + EPS ? 'rage-start' : 'p2';
  return hpFrac <= K.phases.boil + EPS ? 'boil' : 'p1';
}

/** Нижче цього HP удар не опускає, поки подію фази (кипіння, лють) не відіграно — сильний удар не перескакує її. */
export function kazanHpFloor(maxHp, { boiled, raged }) {
  // без округлення (як у Колі): округлене вгору HP лишалось би вище порогу, і подія не запускалась би ніколи
  if (!boiled) return maxHp * K.phases.boil;
  if (!raged) return maxHp * K.phases.rage;
  return 0;
}

/** До якого моменту стіна виливання зайнята: саме виливання і калюжа (лише з 2-го кола, enhanced). */
export function pourBusyTo(pour) {
  return pour.pourTo + (pour.enhanced ? K.pour.puddleMs : 0);
}

/**
 * Наступне виливання. phase — 'p1' | 'p2' | 'rage'; last — попереднє виливання або null.
 * Поза люттю — на стіну гравця, не частіше pourEveryMs фази; у люті — по черзі на обидві стіни.
 * Інваріант безпечної стіни: нове виливання починається щонайменше через rage.gapMs після того, як попередня
 * стіна звільнилась (разом із калюжею), тож обидві стіни ніколи не зайняті разом.
 * Повертає { side, warnFrom, pourFrom, pourTo, enhanced } (мс гри).
 */
export function planPour({ phase, last, nowMs, playerSide, enhanced }) {
  const rage = phase === 'rage';
  const side = rage && last ? otherSide(last.side) : playerSide;
  const pourMs = rage ? K.rage.pourMs : K.pour.pourMs;
  const every = rage ? 0 : K[phase]?.pourEveryMs ?? K.p1.pourEveryMs;
  let pourFrom = nowMs + K.pour.warnMs;
  if (last) {
    pourFrom = Math.max(pourFrom, last.pourFrom + every, pourBusyTo(last) + K.rage.gapMs);
  }
  return { side, warnFrom: pourFrom - K.pour.warnMs, pourFrom, pourTo: pourFrom + pourMs, enhanced };
}

/** Які стіни зайняті лавою в момент nowMs (жевріння-попередження ще не займає). */
export function wallsBusy(pours, nowMs) {
  const busy = { left: false, right: false };
  for (const p of pours) if (nowMs >= p.pourFrom && nowMs < pourBusyTo(p)) busy[p.side] = true;
  return busy;
}

/**
 * Кришка-бумеранг: туди — рівномірно на висоті гравця за половину flightMs, назад — так само, але на returnDyPx вище.
 * Рівномірно, бо синусоїда зависала біля стіни гравця довше за стрибок; назад вище — щоб, перестрибнувши її,
 * гравець не отримав нею ж на іншій стіні. Повертає { x, dy, returning }.
 */
export function lidPath(t, startX, endX, flightMs) {
  const tt = Math.min(Math.max(t, 0), flightMs);
  const half = flightMs / 2;
  const returning = tt > half;
  const k = returning ? (flightMs - tt) / half : tt / half;
  return { x: startX + (endX - startX) * k, dy: returning ? -K.lid.returnDyPx : 0, returning };
}

/**
 * Від магми й кришки рятує стрибок на протилежну стіну — тож Казан б'є ними лише тоді, коли та стіна
 * (від гравця на playerSide) вільна від лави від nowMs до nowMs + windowMs (політ + стрибок із запасом).
 */
export function otherWallFree(pours, playerSide, nowMs, windowMs) {
  const side = otherSide(playerSide);
  const end = nowMs + windowMs;
  return !pours.some((p) => p.side === side && p.pourFrom < end && pourBusyTo(p) > nowMs);
}

/**
 * Жодна стіна не жевріє й не в лаві (з калюжею) у [nowMs, nowMs + windowMs). Магма й кришка летять лише тоді:
 * інакше лава змушує стрибати в один бік, а снаряд — в інший (бот у фазі 2 отримував удари без виходу).
 */
export function pourFree(pours, nowMs, windowMs) {
  const end = nowMs + windowMs;
  return !pours.some((p) => p.warnFrom < end && pourBusyTo(p) > nowMs);
}

/**
 * Звідки кидати кришку: від стіни, де гравця немає зараз (а не на момент лінії — інакше гравець, що стрибнув
 * під час попередження, приземлився б просто під кришку). У стрибку — null: кидок чекає.
 */
export function lidLaunchSide(playerSide, isJumping) {
  return isJumping ? null : otherSide(playerSide);
}
