// Звук без файлів: усі ефекти синтезуються WebAudio (чіптюн), тож жодних чужих прав.
// AudioContext створюється ліниво на першому sfx(): браузер/WebView дозволяє звук лише після дотику,
// а перший звук у грі завжди йде після тапу.

import { TRACKS, parsePattern, trackSteps } from './Music.js';

const MUTE_KEY = 'slime-climb:muted'; // старий спільний ключ (до звуку v2) — лише читаємо
const MUSIC_MUTE_KEY = 'slime-climb:musicMuted';
const SFX_MUTE_KEY = 'slime-climb:sfxMuted';

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
  // поява боса: низьке зловісне «вууу»
  bossAppear: [
    { wave: 'sawtooth', from: 110, to: 55, ms: 900, vol: 0.18 },
    { wave: 'triangle', from: 220, to: 110, ms: 700, vol: 0.2, at: 250 },
  ],
  // павучисі боляче: вереск униз + шум
  bossPain: [
    { wave: 'sawtooth', from: 1100, to: 300, ms: 420, vol: 0.14, vibrato: 18 },
    { noise: true, ms: 180, vol: 0.1 },
  ],
  // рій вилітає: дзижчання
  swarm: [{ wave: 'square', from: 170, to: 230, ms: 450, vol: 0.06, vibrato: 40 }],
  poison: [
    { wave: 'triangle', from: 420, to: 210, ms: 160, vol: 0.14 },
    { wave: 'triangle', from: 300, to: 150, ms: 220, vol: 0.12, at: 140 },
  ],
  // сокира: важкий свист розмаху
  axe: [
    { noise: true, ms: 140, vol: 0.09 },
    { wave: 'sawtooth', from: 260, to: 90, ms: 180, vol: 0.08 },
  ],
  // дробовик: глухий бах
  shotgun: [
    { noise: true, ms: 90, vol: 0.12 },
    { wave: 'square', from: 220, to: 70, ms: 110, vol: 0.08 },
  ],
  // зброя вкачана повністю і стала основною
  weaponReady: [55, 62, 67, 74].map((n, i) => ({ wave: 'sawtooth', from: midiToHz(n), to: midiToHz(n), ms: 110, vol: 0.08, at: i * 70 })),
  // ---- Зима (етап 6a)
  // ведмідь ричить: низький рик із шумом
  roar: [
    { wave: 'sawtooth', from: 140, to: 60, ms: 700, vol: 0.2, vibrato: 12 },
    { noise: true, ms: 400, vol: 0.12, at: 60 },
  ],
  // ельф кидає льодяник
  throw: [{ wave: 'triangle', from: 600, to: 900, ms: 70, vol: 0.06 }],
  // етап 14: нова зброя
  zap: [{ noise: true, ms: 60, vol: 0.06 }, { wave: 'sawtooth', from: 1800, to: 400, ms: 90, vol: 0.04 }],
  fireball: [{ wave: 'triangle', from: 220, to: 120, ms: 110, vol: 0.07 }, { noise: true, ms: 80, vol: 0.03 }],
  whoosh: [{ wave: 'triangle', from: 300, to: 520, ms: 120, vol: 0.05 }],
  // подарунок підібрано
  gift: [76, 83].map((n, i) => ({ wave: 'square', from: midiToHz(n), to: midiToHz(n), ms: 70, vol: 0.08, at: i * 70 })),
  // Санта летить: дзвіночки
  jingle: [84, 88, 84, 88, 91].map((n, i) => ({ wave: 'triangle', from: midiToHz(n), to: midiToHz(n), ms: 90, vol: 0.1, at: i * 110 })),
  // фідбек-8: Санта сміється «йо-хо-хо» — синтез без запису голосу: придих (шум) + низький «голос» з вібрато, обертон зверху.
  // Перший склад вищий («йо»), два нижчі. Це чіптюн-імітація, не мова.
  hohoho: [
    [196, 165],
    [147, 123],
    [147, 110],
  ].flatMap(([from, to], i) => [
    { noise: true, ms: 50, vol: 0.05, at: 500 + i * 300 },
    { wave: 'sawtooth', from, to, ms: 230, vol: 0.15, vibrato: 7, at: 530 + i * 300 },
    { wave: 'triangle', from: from * 2, to: to * 2, ms: 200, vol: 0.06, at: 530 + i * 300 },
  ]),
  // ---- Шкодько (етап 6b)
  // вибух подарунка-бомби: глухий бах із шумом
  boom: [
    { noise: true, ms: 260, vol: 0.18 },
    { wave: 'square', from: 140, to: 40, ms: 260, vol: 0.12 },
  ],
  // свисток потяга: два гудки
  whistle: [
    { wave: 'square', from: 880, to: 900, ms: 260, vol: 0.08, vibrato: 8 },
    { wave: 'square', from: 740, to: 760, ms: 420, vol: 0.08, vibrato: 8, at: 300 },
  ],
  // Шкодько сміється: «хе-хе-хе» вниз
  laugh: [72, 70, 68, 65].map((n, i) => ({ wave: 'sawtooth', from: midiToHz(n), to: midiToHz(n - 2), ms: 90, vol: 0.09, at: i * 120 })),
  // ---- Бамбук і Коля (етап 9)
  // клуб диму ніндзі
  poof: [{ noise: true, ms: 180, vol: 0.07 }],
  // ліхтарик зайнявся: шипіння гніту
  fuse: [{ noise: true, ms: 600, vol: 0.05 }, { wave: 'square', from: 1200, to: 1600, ms: 600, vol: 0.03, vibrato: 30 }],
  // Коля плює слизом
  spit: [{ wave: 'triangle', from: 300, to: 160, ms: 90, vol: 0.08 }],
  // Коля ділиться / народжує малих: булькання
  squelch: [0, 1, 2, 3].map((i) => ({ wave: 'sine', from: 220 + i * 40, to: 120 + i * 30, ms: 110, vol: 0.12, at: i * 90 })),
  // Коля з'їдає рештки: «ням-ням»
  gulp: [0, 1, 2].map((i) => ({ wave: 'square', from: 180, to: 90, ms: 140, vol: 0.09, at: i * 220 })),
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
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;
let prefs = null; // { music, sfx } — true = вимкнено
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

/**
 * Окремі перемикачі музики й ефектів (звук v2). Зі старого спільного ключа MUTE_KEY переноситься вибір:
 * хто вимикав звук до оновлення, той і далі в тиші — і музика, і ефекти.
 */
export function loadSoundPrefs(store) {
  const read = (key) => {
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const legacy = read(MUTE_KEY) === '1';
  const flag = (key) => {
    const v = read(key);
    return v === null ? legacy : v === '1';
  };
  return { music: flag(MUSIC_MUTE_KEY), sfx: flag(SFX_MUTE_KEY) };
}

function getPrefs() {
  if (!prefs) prefs = loadSoundPrefs(storage());
  return prefs;
}

function savePref(key, value) {
  try {
    storage()?.setItem(key, value ? '1' : '0');
  } catch {
    // сховище недоступне — налаштування живе до перезапуску
  }
}

export function isMusicMuted() {
  return getPrefs().music;
}

export function isSfxMuted() {
  return getPrefs().sfx;
}

/** Обидва вимкнені — «звуку немає взагалі». */
export function isMuted() {
  return isMusicMuted() && isSfxMuted();
}

export function setSfxMuted(value) {
  getPrefs().sfx = Boolean(value);
  savePref(SFX_MUTE_KEY, prefs.sfx);
  if (sfxBus) sfxBus.gain.value = prefs.sfx ? 0 : 1;
}

/** Вимкнена музика не планується зовсім (менше роботи телефону); увімкнули — грає те, що мало б грати зараз. */
export function setMusicMuted(value) {
  getPrefs().music = Boolean(value);
  savePref(MUSIC_MUTE_KEY, prefs.music);
  if (prefs.music) {
    // одноразову фанфару не відкладаємо на потім — після увімкнення одразу її продовження
    if (wanted && TRACKS[wanted.name] && !TRACKS[wanted.name].loop) {
      const next = wanted.next ?? TRACKS[wanted.name].next;
      wanted = next ? { name: next } : null;
    }
    halt();
  } else if (wanted && !music) {
    const w = wanted;
    wanted = null;
    playMusic(w.name, { next: w.next });
  }
}

function ensureContext() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = isSfxMuted() ? 0 : 1;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function playTone(t, start, out = sfxBus) {
  const end = start + t.ms / 1000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(t.vol, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(out);
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
  if (isSfxMuted() || !SOUNDS[name]) return;
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended' && !inBackground) c.resume();
  const nowMs = c.currentTime * 1000;
  if (nowMs - (lastPlayed[name] ?? -Infinity) < MIN_GAP_MS) return;
  lastPlayed[name] = nowMs;
  const start = c.currentTime + 0.005;
  for (const t of SOUNDS[name]) playTone(t, start + (t.at ?? 0) / 1000);
}

/** Пауза/продовження всього звуку разом із грою (згорнутий застосунок): час WebAudio теж стоїть. */
export function suspendAudio() {
  heldByGame = true;
  if (ctx && ctx.state === 'running') ctx.suspend();
}

export function resumeAudio() {
  heldByGame = false;
  if (!inBackground && ctx && ctx.state === 'suspended') ctx.resume();
}

/**
 * Застосунок пішов у фон / повернувся (екран вимкнено, згорнуто, інша вкладка) — на будь-якому екрані, не лише в грі.
 * Баг 2026-11-20: раніше звук приспавала лише сцена гри, тож музика меню грала при вимкненому екрані.
 * Повернення будить звук, лише якщо його не тримає пауза гри (там — до «Продовжити»).
 */
export function setAppBackground(hidden) {
  inBackground = Boolean(hidden);
  if (!ctx) return;
  if (inBackground) {
    if (ctx.state === 'running') ctx.suspend();
  } else if (!heldByGame && ctx.state === 'suspended') {
    ctx.resume();
  }
}

// Музика меню вмикається до першого дотику, а браузер/WebView тримає AudioContext приспаним, доки людина не торкнеться
// екрана. Тому перший (і кожен) дотик будить контекст — якщо його не приспала сама гра (пауза, згорнутий застосунок).
let heldByGame = false;
let inBackground = false; // застосунок у фоні (setAppBackground)
function unlock() {
  if (!heldByGame && !inBackground && ctx && ctx.state === 'suspended') ctx.resume();
}
if (typeof document !== 'undefined') {
  for (const type of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(type, unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => setAppBackground(document.hidden));
}

// ---- Музика: планувальник з невеликим запасом наперед (стандартний підхід WebAudio) ----

const LOOKAHEAD_SEC = 0.25;
const TICK_MS = 60;
const FADE_SEC = 0.15;

let music = null; // { name, track, events, steps, stepSec, step, nextTime, out, timer, next }
let wanted = null; // { name, next } — що має грати зараз (і коли музику вимкнено)

/** Стан треку name від моменту atTime. out — вихідний вузол (новий, якщо не передано). */
function startTrack(name, atTime, out = null) {
  const track = TRACKS[name];
  if (!out) {
    out = ctx.createGain();
    out.connect(musicBus);
  }
  const stepSec = 60 / track.bpm / 4;
  const events = track.voices.map((v) => ({ voice: v, list: parsePattern(v.pattern) }));
  return { name, track, events, steps: trackSteps(track), stepSec, step: 0, nextTime: atTime, out };
}

function scheduleStep(m, step, time) {
  for (const { voice, list } of m.events) {
    for (const e of list) {
      if (e.step !== step) continue;
      playTone(drumOrNote(e, voice, m.stepSec), time, m.out);
    }
  }
}

/** Подія патерну → тон: нота, бочка (k — синус з падінням висоти), хет (h — дуже короткий шум), шум (x). */
export function drumOrNote(e, voice, stepSec) {
  const ms = e.len * stepSec * 1000;
  if (e.kick) return { wave: 'sine', from: 150, to: 45, ms: 140, vol: voice.vol * 2 };
  if (e.hat) return { noise: true, ms: 18, vol: voice.vol * 0.6 };
  if (e.noise) return { noise: true, ms: Math.min(ms * 0.5, 60), vol: voice.vol };
  return { wave: voice.wave, from: midiToHz(e.midi), to: midiToHz(e.midi), ms: ms * 0.95, vol: voice.vol };
}

function tick() {
  if (!music || !ctx) return;
  while (music.nextTime < ctx.currentTime + LOOKAHEAD_SEC) {
    if (music.step >= music.steps) {
      if (music.track.loop) {
        music.step = 0;
      } else {
        // кінець одноразового треку — далі наступний, без паузи і в тому ж вихідному вузлі
        const { out, nextTime, timer } = music;
        const nextName = music.next ?? music.track.next;
        if (!nextName || !TRACKS[nextName]) {
          wanted = null;
          halt();
          return;
        }
        music = { ...startTrack(nextName, nextTime, out), timer };
        wanted = { name: nextName };
      }
    }
    scheduleStep(music, music.step, music.nextTime);
    music.step += 1;
    music.nextTime += music.stepSec;
  }
}

/**
 * Вмикає трек name (з початку). Той самий трек, що вже грає, не перезапускається.
 * next — що грати після одноразового треку (замість track.next): фанфара перемоги → музика біому.
 * afterCurrent — якщо зараз грає одноразовий трек (фанфара), не обривати його, а поставити name після нього.
 */
export function playMusic(name, { next = null, afterCurrent = false } = {}) {
  if (!TRACKS[name]) return;
  if (afterCurrent && wanted && wanted.name !== name && TRACKS[wanted.name] && !TRACKS[wanted.name].loop) {
    wanted.next = name;
    if (music) music.next = name;
    return;
  }
  if (wanted?.name === name && (music || isMusicMuted())) {
    if (next) {
      wanted.next = next;
      if (music) music.next = next;
    }
    return;
  }
  wanted = { name, next };
  if (isMusicMuted()) {
    halt();
    return;
  }
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended' && !inBackground) c.resume();
  halt();
  music = startTrack(name, c.currentTime + 0.05);
  music.next = next;
  music.timer = setInterval(tick, TICK_MS);
  tick();
}

/** Зупиняє програвання: уже заплановані ноти швидко затихають (що «має грати», не забуває). */
function halt() {
  if (!music) return;
  clearInterval(music.timer);
  const { out } = music;
  music = null;
  if (!ctx) return;
  const t = ctx.currentTime;
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.linearRampToValueAtTime(0, t + FADE_SEC);
  setTimeout(() => out.disconnect(), (FADE_SEC + LOOKAHEAD_SEC) * 1000 + 50);
}

/** Зупиняє музику зовсім (смерть, вихід у меню): після увімкнення музики нічого не заграє саме. */
export function stopMusic() {
  wanted = null;
  halt();
}

/** Назва треку, що має грати зараз (грає або чекає, поки увімкнуть музику) — для тестів і перевірок у браузері. */
export function currentMusic() {
  return wanted?.name ?? null;
}

/** Чи справді щось планується зараз (а не лише «має грати»). */
export function musicPlaying() {
  return music !== null;
}

/** Стан AudioContext ('running' | 'suspended' | null — ще не створено): для страховок. */
export function audioState() {
  return ctx?.state ?? null;
}
