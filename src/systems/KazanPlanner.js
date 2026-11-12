// Бос 4 «Пан Казан» (етап 11, §11.3): фази, виливання лави на стіни, кришка-бумеранг. Чисті функції без Phaser.
// Частки HP — від maxHp (з множником кола й «Складності»).
import { BALANCE } from '../config/balance.js';
import { otherSide } from './WallWalkers.js';

const K = BALANCE.kazan;

/** Фаза за часткою HP: 'p1' → 'boil' (раз) → 'p2' → 'rage-start' (раз) → 'rage'. Фази не відкочуються. */
export function kazanPhase(hpFrac, { boiled, raged }) {
  if (raged) return 'rage';
  if (boiled) return hpFrac <= K.phases.rage ? 'rage-start' : 'p2';
  return hpFrac <= K.phases.boil ? 'boil' : 'p1';
}

/** Нижче цього HP удар не опускає, поки подію фази (кипіння, лють) не відіграно — сильний удар не перескакує її. */
export function kazanHpFloor(maxHp, { boiled, raged }) {
  if (!boiled) return Math.round(maxHp * K.phases.boil);
  if (!raged) return Math.round(maxHp * K.phases.rage);
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

/** Кришка-бумеранг: x за t мс польоту — туди за половину flightMs і назад тим самим шляхом. */
export function lidPath(t, startX, endX, flightMs) {
  const k = Math.sin((Math.PI * Math.min(Math.max(t, 0), flightMs)) / flightMs);
  return { x: startX + (endX - startX) * k, returning: t > flightMs / 2 };
}
