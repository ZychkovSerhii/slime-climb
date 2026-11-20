// Бойова музика (звук v2): своя тема кожному босу, 8 тактів по колу. Лють — та сама тема швидше
// (павучиха має окрему «rage» ще з етапу 2, тут — решта). Усе своє, нотами.
import { follow, mel, prog, times } from './compose.js';

// ---- Білий ведмідь: мі мінор, важкий марш 126 bpm
const bearChords = prog('Em Em C D Em Em C B', 2);
const bossBear = {
  bpm: 126,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.1, pattern: follow(bearChords, '0 . 0 . - - 0 . 2 . 0 . - - 1 .') },
    {
      wave: 'square',
      vol: 0.045,
      pattern: mel(
        'E4 . . . G4 . . . B4 . . . A4 . G4 .',
        'E4 . . . . . . . B3 . . . E4 . . .',
        'C5 . . . B4 . . . G4 . . . E4 . . .',
        'F#4 . . . A4 . . . D5 . . . C5 . A4 .',
        'E5 . . . D5 . B4 . G4 . . . B4 . . .',
        'E5 . . . . . . . G5 . F#5 . E5 . . .',
        'C5 . . . E5 . . . G5 . . . E5 . . .',
        'D#5 . . . . . . . F#4 . . . B4 . . .',
      ),
    },
    { wave: 'noise', vol: 0.035, pattern: times('k - - - x - - - k - k - x - - -', 8) },
  ],
};

// ---- Шкодько: соль мажор, пустотливе стаккато 150 bpm
const bossShkodko = {
  bpm: 150,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.09, pattern: follow(prog('G Em C D G Em C D7', 2), '0 - 2 - 0^ - 2 - 0 - 2 - 0^ - 2 -') },
    {
      wave: 'square',
      vol: 0.04,
      pattern: mel(
        'D5 - B4 - D5 - B4 - G4 - A4 - B4 - - -',
        'E5 - G5 - E5 - B4 - G4 - B4 - E5 - - -',
        'C5 - E5 - G5 - E5 - C5 - - - E5 - D5 -',
        'D5 - F#5 - A5 - F#5 - D5 . . . - - - -',
        'G5 - F#5 - E5 - D5 - B4 - D5 - G5 - - -',
        'B4 - E5 - G5 - B5 - G5 - E5 - B4 - - -',
        'C5 - D5 - E5 - G5 - E5 - C5 - A4 - - -',
        'D5 - - - A4 - - - F#4 - A4 - D5 - - -',
      ),
    },
    { wave: 'noise', vol: 0.03, pattern: times('k - h x h - h - k - h x h - x h', 8) },
  ],
};

// ---- Слимак Коля: ре мінор, в'язко 112 bpm; пила на басу й «бульбашки» високих нот
const bossKolya = {
  bpm: 112,
  loop: true,
  voices: [
    { wave: 'sawtooth', vol: 0.035, pattern: follow(prog('Dm Dm Bb A Dm Dm Gm A', 2), '0 . . . . . 0 . 0 . . . 1 . 2 .') },
    { wave: 'square', vol: 0.02, pattern: follow(prog('Dm Dm Bb A Dm Dm Gm A', 5), '- - 0 - - - - 2 - - - - 1 - - -') },
    {
      wave: 'triangle',
      vol: 0.08,
      pattern: mel(
        'D5 . . . . . F5 . E5 . . . D5 . . .',
        'A4 . . . . . . . . . . . - - - -',
        'Bb4 . . . D5 . . . F5 . . . E5 . D5 .',
        'C#5 . . . . . . . E5 . . . . . . .',
        'D5 . . . F5 . . . A5 . . . G5 . F5 .',
        'E5 . . . D5 . . . A4 . . . - - - -',
        'Bb4 . . . D5 . . . G5 . . . F5 . E5 .',
        'C#5 . . . E5 . . . A4 . . . . . . .',
      ),
    },
    { wave: 'noise', vol: 0.03, pattern: times('k - - - - - x - - - k - - - x -', 8) },
  ],
};

// ---- Пан Казан: до мінор, металевий 144 bpm, пила шістнадцятими
const bossKazan = {
  bpm: 144,
  loop: true,
  voices: [
    { wave: 'sawtooth', vol: 0.035, pattern: follow(prog('Cm Cm Db Cm Cm Ab Bb G', 2), '0 0 - 0 0 - 0^ - 0 0 - 0 1 - 0^ -') },
    {
      wave: 'square',
      vol: 0.045,
      pattern: mel(
        'C5 . . . Eb5 . . . G5 . . . F5 . Eb5 .',
        'D5 . C5 . . . . . G4 . . . C5 . . .',
        'Db5 . . . F5 . . . Ab5 . . . F5 . Db5 .',
        'C5 . . . . . . . - - - - - - - -',
        'G5 . . . Eb5 . . . C5 . . . Eb5 . G5 .',
        'Ab5 . . . . . . . Eb5 . C5 . Ab4 . . .',
        'Bb4 . . . D5 . . . F5 . . . Bb5 . . .',
        'B4 . . . D5 . . . G5 . . . B4 . . .',
      ),
    },
    { wave: 'noise', vol: 0.035, pattern: times('k - h k x - h - k - h k x - x x', 8) },
  ],
};

/** Лють: та сама тема на 30% швидше (на слух — «бос розлютився», а не інша пісня). */
export const RAGE_BPM_MUL = 1.3;
const rageOf = (t) => ({ ...t, bpm: Math.round(t.bpm * RAGE_BPM_MUL) });

export const BOSS_TRACKS = {
  bossBear,
  bossShkodko,
  bossKolya,
  bossKazan,
  rageShkodko: rageOf(bossShkodko),
  rageKolya: rageOf(bossKolya),
  rageKazan: rageOf(bossKazan),
};
