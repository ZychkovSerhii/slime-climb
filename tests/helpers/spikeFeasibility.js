// Перевірка «чесності» шипів: чи існує розклад тапів, з яким гравець проходить відрізок часу
// без жодного удару шипом. Модель повторює GameScene: кадри 60 fps, світ їде зі scrollSpeed(t),
// стрибок триває jumpDurationMs, у перші/останні ~7 % стрибка слизак ще торкається стіни.
import { BALANCE } from '../../src/config/balance.js';
import { scrollSpeed } from '../../src/systems/Difficulty.js';

const PLAYER_Y = BALANCE.playerYRatio * 1280;
// +4 px: тіла фізики й округлення кадрів — зона удару трохи ширша за «ідеальну»
const HALF = (BALANCE.playerSize + BALANCE.spikeHeight) / 2 + 4;
// Затримка старту стрибка: твін зрушує слизака лише через ~2 кадри після тапу
const START_LATENCY_MS = 2 * (1000 / 60);
const FRAME_MS = 1000 / 60;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * generate(frame) викликається щокадру з { tSec, distancePx, dy } і повертає масив нових шипів
 * { side, y } у координатах екрана (y — центр шипа в момент появи). Повертає секунду першого
 * неминучого удару або null, якщо durationSec можна пройти без ударів.
 */
export function firstUnavoidableHit(generate, durationSec, stepMs = 2) {
  const N = Math.floor((durationSec * 1000) / stepMs);
  const D = new Float64Array(N + 1); // пройдена відстань на кроці i
  for (let i = 1; i <= N; i++) D[i] = D[i - 1] + (scrollSpeed((i * stepMs) / 1000, false) * stepMs) / 1000;

  // шипи: d0 — відстань, на якій шип з'явився, y0 — його екранний y тоді
  const spikes = [];
  let prevD = 0;
  for (let f = 1; f * FRAME_MS < N * stepMs; f++) {
    const i = Math.round((f * FRAME_MS) / stepMs);
    const tSec = (i * stepMs) / 1000;
    for (const s of generate({ tSec, distancePx: D[i], dy: D[i] - prevD })) spikes.push({ ...s, d0: D[i] });
    prevD = D[i];
  }
  const occ = { left: new Uint8Array(N + 1), right: new Uint8Array(N + 1) };
  for (const s of spikes) {
    let i = 0;
    for (i = 0; i <= N; i++) {
      const y = s.y + (D[i] - s.d0);
      if (y > PLAYER_Y + HALF) break;
      if (y > PLAYER_Y - HALF && D[i] >= s.d0) occ[s.side][i] = 1;
    }
  }

  const LAT = Math.round(START_LATENCY_MS / stepMs);
  const JUMP = Math.round(BALANCE.jumpDurationMs / stepMs) + LAT;
  // перші LAT кроків + ~7.5 % польоту слизак ще над стіною старту, останні ~7.5 % — уже над стіною приземлення
  const EDGE_START = LAT + Math.ceil((JUMP - LAT) * 0.075);
  const EDGE_END = Math.ceil((JUMP - LAT) * 0.075);
  let onL = true;
  let onR = false;
  let airLR = new Uint8Array(JUMP + 1);
  let airRL = new Uint8Array(JUMP + 1);
  for (let i = 1; i <= N; i++) {
    const nLR = new Uint8Array(JUMP + 1);
    const nRL = new Uint8Array(JUMP + 1);
    if (onL) nLR[0] = 1;
    if (onR) nRL[0] = 1;
    for (let e = 0; e < JUMP; e++) {
      if (airLR[e]) nLR[e + 1] = 1;
      if (airRL[e]) nRL[e + 1] = 1;
    }
    let nL = onL || nRL[JUMP] === 1;
    let nR = onR || nLR[JUMP] === 1;
    if (occ.left[i]) nL = false;
    if (occ.right[i]) nR = false;
    let any = nL || nR;
    for (let e = 0; e <= JUMP; e++) {
      if (nLR[e] && ((e < EDGE_START && occ.left[i]) || (e > JUMP - EDGE_END && occ.right[i]))) nLR[e] = 0;
      if (nRL[e] && ((e < EDGE_START && occ.right[i]) || (e > JUMP - EDGE_END && occ.left[i]))) nRL[e] = 0;
      any = any || nLR[e] === 1 || nRL[e] === 1;
    }
    if (!any) return (i * stepMs) / 1000;
    onL = nL;
    onR = nR;
    airLR = nLR;
    airRL = nRL;
  }
  return null;
}
