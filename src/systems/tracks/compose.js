// Хелпери для запису треків (звук v2): акорди → бас і арпеджіо, перевірка тактів. Без WebAudio, лише рядки патернів.
// Такт = 16 токенів (1/16). Токени — як у Music.js: нота, '.', '-', 'x', 'k', 'h'.

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITIES = { M: [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6] };

/** 61 → 'C#4'. */
export function midiToNote(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** 'Bbm' в октаві 2 → MIDI тонів акорду [46, 49, 53]. Без суфікса — мажор; '5' — квінта, '7' — домінантсепт. */
export function chord(name, octave) {
  const m = /^([A-G])([#b]?)(m7|m|5|7|dim)?$/.exec(name);
  if (!m) throw new Error(`Невідомий акорд: ${name}`);
  const root = 12 * (octave + 1) + LETTERS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return QUALITIES[m[3] ?? 'M'].map((i) => root + i);
}

/** 'Dm C Bb A' → масив акордів (по такту на кожен). */
export function prog(names, octave) {
  return names.trim().split(/\s+/).map((n) => chord(n, octave));
}

function checkBar(bar, where) {
  const n = bar.trim().split(/\s+/).length;
  if (n !== 16) throw new Error(`${where}: у такті ${n} токенів замість 16 — «${bar}»`);
  return bar.trim();
}

/** Такти мелодії підряд; кожен перевіряється на 16 токенів (помилка в треку ловиться одразу тестом). */
export function mel(...bars) {
  return bars.map((b, i) => checkBar(b, `такт ${i + 1}`)).join(' ');
}

/** n тактів тиші. */
export function rest(n) {
  return Array(n * 16).fill('-').join(' ');
}

/** Той самий шматок n разів. */
export function times(pattern, n) {
  return Array(n).fill(pattern.trim()).join(' ');
}

/**
 * Голос за акордами: shape — такт із 16 токенів, де цифра — номер тону акорду (за межами акорду — на октаву вище),
 * '^' після цифри — ще на октаву вгору, '_' — вниз. Решта токенів ('.', '-', 'k'…) — як є.
 */
export function follow(chords, shape) {
  const toks = checkBar(shape, 'форма').split(/\s+/);
  return chords
    .map((ch) =>
      toks
        .map((t) => {
          const m = /^(\d)([\^_]?)$/.exec(t);
          if (!m) return t;
          const i = Number(m[1]);
          let midi = ch[i % ch.length] + 12 * Math.floor(i / ch.length);
          if (m[2] === '^') midi += 12;
          if (m[2] === '_') midi -= 12;
          return midiToNote(midi);
        })
        .join(' '),
    )
    .join(' ');
}
