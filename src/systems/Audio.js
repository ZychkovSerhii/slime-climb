// Звук без файлів: усі ефекти синтезуються WebAudio (чіптюн), тож жодних чужих прав.
// AudioContext створюється ліниво на першому sfx(): браузер/WebView дозволяє звук лише після дотику,
// а перший звук у грі завжди йде після тапу.

const MUTE_KEY = 'slime-climb:muted';

/** Частота ноти за номером MIDI (69 = A4 = 440 Гц). */
export function midiToHz(n) {
  return 440 * 2 ** ((n - 69) / 12);
}

/**
 * Опис ефектів: послідовність тонів { wave, from, to (Гц), ms, vol, at (мс від старту), vibrato? }
 * або шуму { noise: true, ms, vol, at }. Чиста функція — перевіряється тестами.
 */
export const SOUNDS = {
  jump: [{ wave: 'square', from: 330, to: 660, ms: 90, vol: 0.12 }],
  reverse: [{ wave: 'square', from: 660, to: 330, ms: 80, vol: 0.1 }],
  shoot: [{ wave: 'square', from: 980, to: 520, ms: 45, vol: 0.04 }],
  hit: [{ noise: true, ms: 35, vol: 0.08 }],
  kill: [
    { wave: 'square', from: 520, to: 520, ms: 50, vol: 0.08 },
    { wave: 'square', from: 780, to: 780, ms: 70, vol: 0.08, at: 50 },
  ],
  hurt: [
    { wave: 'sawtooth', from: 240, to: 70, ms: 260, vol: 0.18 },
    { noise: true, ms: 120, vol: 0.1 },
  ],
  bite: [
    { noise: true, ms: 60, vol: 0.14 },
    { wave: 'square', from: 160, to: 90, ms: 90, vol: 0.12, at: 20 },
  ],
  levelUp: [60, 64, 67, 72].map((n, i) => ({ wave: 'square', from: midiToHz(n), to: midiToHz(n), ms: 90, vol: 0.1, at: i * 85 })),
  // сумне «ту-ту-ту-туууу»: три короткі ноти вниз по півтону і довга остання з вібрато
  gameOver: [
    { wave: 'triangle', from: midiToHz(67), to: midiToHz(67), ms: 300, vol: 0.28, at: 0 },
    { wave: 'triangle', from: midiToHz(66), to: midiToHz(66), ms: 300, vol: 0.28, at: 340 },
    { wave: 'triangle', from: midiToHz(65), to: midiToHz(65), ms: 300, vol: 0.28, at: 680 },
    { wave: 'triangle', from: midiToHz(64), to: midiToHz(62), ms: 1300, vol: 0.3, at: 1020, vibrato: 6 },
  ],
};

/** Тривалість ефекту (мс) — для тестів і щоб не накладати його сам на себе. */
export function soundLengthMs(name) {
  return Math.max(...SOUNDS[name].map((t) => (t.at ?? 0) + t.ms));
}

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = null;
const lastPlayed = {};
// той самий ефект не частіше ніж раз на стільки мс (постріли черги не зливаються в гул)
const MIN_GAP_MS = 30;

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function isMuted() {
  if (muted === null) muted = storage()?.getItem(MUTE_KEY) === '1';
  return muted;
}

export function setMuted(value) {
  muted = Boolean(value);
  try {
    storage()?.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // сховище недоступне — налаштування живе до перезапуску
  }
  if (master) master.gain.value = muted ? 0 : 1;
}

function ensureContext() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = isMuted() ? 0 : 1;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function playTone(t, start) {
  const end = start + t.ms / 1000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(t.vol, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(master);
  if (t.noise) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.connect(gain);
    src.start(start);
    src.stop(end);
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = t.wave;
  osc.frequency.setValueAtTime(t.from, start);
  if (t.to !== t.from) osc.frequency.exponentialRampToValueAtTime(t.to, end);
  if (t.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = t.vibrato;
    depth.gain.value = t.from * 0.03;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(end);
  }
  osc.connect(gain);
  osc.start(start);
  osc.stop(end);
}

/** Програє ефект name. Тихо нічого не робить, якщо звук вимкнено або WebAudio недоступний. */
export function sfx(name) {
  if (isMuted() || !SOUNDS[name]) return;
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const nowMs = c.currentTime * 1000;
  if (nowMs - (lastPlayed[name] ?? -Infinity) < MIN_GAP_MS) return;
  lastPlayed[name] = nowMs;
  const start = c.currentTime + 0.005;
  for (const t of SOUNDS[name]) playTone(t, start + (t.at ?? 0) / 1000);
}
