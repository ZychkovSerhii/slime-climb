// Музика без файлів: короткі чіптюн-петлі, написані тут нотами й програні WebAudio (див. Audio.js).
// Нотація патерну — токени через пробіл, один токен = одна 1/16:
//   'A2', 'C#4', 'Bb3' — нота; '.' — тягнути попередню; '-' — пауза; 'x' — удар шуму (барабан).

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' → 69, 'C#4' → 61, 'Bb3' → 58. */
export function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Невідома нота: ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + acc;
}

/** Патерн → події [{ step, midi | noise, len }] (len — у кроках 1/16). */
export function parsePattern(pattern) {
  const events = [];
  let last = null;
  pattern
    .trim()
    .split(/\s+/)
    .forEach((tok, step) => {
      if (tok === '.') {
        if (last) last.len += 1;
        return;
      }
      if (tok === '-') {
        last = null;
        return;
      }
      last = tok === 'x' ? { step, noise: true, len: 1 } : { step, midi: noteToMidi(tok), len: 1 };
      events.push(last);
    });
  return events;
}

/** Довжина треку в кроках 1/16 (за першим голосом; тести перевіряють, що всі однакові). */
export function trackSteps(track) {
  return track.voices[0].pattern.trim().split(/\s+/).length;
}

const bars = (...parts) => parts.join(' ');

/**
 * Треки. loop — грати по колу; інакше після кінця вмикається next.
 * voices: { wave ('square' | 'triangle' | 'sawtooth' | 'noise'), vol, pattern }.
 */
export const TRACKS = {
  // Бій з павучихою: ля мінор, напружений бас і проста тема
  boss: {
    bpm: 140,
    loop: true,
    voices: [
      {
        wave: 'square',
        vol: 0.05,
        pattern: bars('A2 - A2 - A3 - A2 - G2 - G2 - G3 - G2 -', 'F2 - F2 - F3 - F2 - E2 - E2 - E3 - E2 -'),
      },
      {
        wave: 'triangle',
        vol: 0.09,
        pattern: bars('A4 . . . C5 . B4 . A4 . . . E4 . . .', 'F4 . . . A4 . G4 . E4 . . . . . - -'),
      },
      { wave: 'noise', vol: 0.025, pattern: bars('x - - - x - - - x - - - x - x -', 'x - - - x - - - x - - - x - x -') },
    ],
  },
  // Лють: та сама тональність, швидше і щільніше
  rage: {
    bpm: 190,
    loop: true,
    voices: [
      {
        wave: 'sawtooth',
        vol: 0.04,
        pattern: bars(
          'A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2',
          'F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 G#2 G#2 G#3 G#2',
        ),
      },
      {
        wave: 'square',
        vol: 0.05,
        pattern: bars('A4 - C5 - E5 - D5 C5 B4 - G4 - B4 - D5 -', 'C5 - A4 - F4 - A4 C5 B4 . . . G#4 . . .'),
      },
      { wave: 'noise', vol: 0.03, pattern: bars('x - x - x - x x x - x - x - x x', 'x - x - x - x x x - x - x x x x') },
    ],
  },
  // Перемога: коротка фанфара, далі — тема після боса
  victory: {
    bpm: 150,
    loop: false,
    next: 'after',
    voices: [
      { wave: 'square', vol: 0.07, pattern: 'C5 - E5 - G5 - C6 . . . . . - - - -' },
      { wave: 'triangle', vol: 0.09, pattern: 'C3 . . . G2 . . . C3 . . . . . - -' },
    ],
  },
  // Після боса: спокійніша мажорна петля, тихіше за бій
  after: {
    bpm: 115,
    loop: true,
    voices: [
      {
        wave: 'triangle',
        vol: 0.08,
        pattern: bars(
          'C3 - - - G2 - - - A2 - - - E2 - - -',
          'F2 - - - C3 - - - F2 - - - G2 - - -',
          'C3 - - - G2 - - - A2 - - - E2 - - -',
          'F2 - - - G2 - - - C3 . . . - - - -',
        ),
      },
      {
        wave: 'square',
        vol: 0.035,
        pattern: bars(
          'E4 . G4 . C5 . . . B4 . G4 . E4 . . .',
          'A4 . C5 . E5 . . . D5 . C5 . A4 . . .',
          'F4 . A4 . C5 . . . A4 . F4 . C4 . . .',
          'D4 . G4 . B4 . . . C5 . . . - - - -',
        ),
      },
    ],
  },
};
