// Фонова музика (звук v2): меню й п'ять біомів. Тихіша за бої — грає хвилинами, тож петлі довгі (8–16 тактів)
// і з тактами без мелодії, щоб вухо відпочивало. Усе своє, нотами — жодних чужих мелодій.
import { follow, mel, prog, times } from './compose.js';

// ---- Меню: до мажор, бадьоро, 8 тактів
const menuChords = prog('C Am F G C Am F G', 2);
const menu = {
  bpm: 120,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.08, pattern: follow(menuChords, '0 . - 2 . - 0^ - 0 . - 2 . - 1 -') },
    { wave: 'square', vol: 0.018, pattern: follow(prog('C Am F G C Am F G', 4), '0 1 2 1 0^ 2 1 2 0 1 2 1 0^ 2 1 2') },
    {
      wave: 'triangle',
      vol: 0.06,
      pattern: mel(
        'E5 . . . G5 . E5 . C5 . . . D5 . E5 .',
        'C5 . . . . . A4 . E5 . . . C5 . . .',
        'A4 . C5 . F5 . . . E5 . D5 . C5 . . .',
        'D5 . . . G4 . . . B4 . . . D5 . . .',
        'E5 . . . G5 . E5 . C6 . . . B5 . A5 .',
        'A5 . . . E5 . . . C5 . . . E5 . . .',
        'F5 . . . A5 . . . G5 . F5 . E5 . D5 .',
        'C5 . . . . . . . - - - - - - - -',
      ),
    },
    { wave: 'noise', vol: 0.03, pattern: times('k - h - - - h - k - h - - - h -', 8) },
  ],
};

// ---- Печера: ре дорійський, 100 bpm, «краплі» високих нот і сповільнений бас. 16 тактів (~38 с):
// вступ без мелодії → тема → середина → відповідь
const caveChords = prog('Dm C Bb C Dm C Bb A Bb C Dm Dm Gm Bb A A', 2);
const cave = {
  bpm: 100,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.08, pattern: follow(caveChords, '0 . . . - - 0 - 2 . . . - - 1 -') },
    { wave: 'square', vol: 0.016, pattern: follow(prog('Dm C Bb C Dm C Bb A Bb C Dm Dm Gm Bb A A', 4), '- - 2^ - - - - - 0^ - - 1^ - - - -') },
    {
      wave: 'square',
      vol: 0.03,
      pattern: mel(
        ...Array(4).fill('- - - - - - - - - - - - - - - -'),
        'A4 . . . - - F4 . E4 . D4 . . . - -',
        'E4 . . . G4 . . . C5 . . . - - - -',
        'D5 . . . C5 . Bb4 . A4 . . . F4 . . .',
        'E4 . . . . . . . C#4 . . . - - - -',
        'F4 . G4 . A4 . . . Bb4 . A4 . G4 . . .',
        'E4 . F4 . G4 . . . C5 . . . G4 . . .',
        'A4 . . . . . . . F4 . E4 . D4 . . .',
        '- - - - - - - - - - - - - - - -',
        'G4 . . . Bb4 . . . D5 . . . C5 . Bb4 .',
        'A4 . . . F4 . . . D4 . . . F4 . . .',
        'E4 . . . . . . . A4 . . . G4 . . .',
        'E4 . . . . . . . - - - - - - - -',
      ),
    },
    { wave: 'noise', vol: 0.025, pattern: times('k - - - - - h - k - - - - - h -', 16) },
  ],
};

// ---- Зима: мі мінор, 110 bpm, «бубонці» на хетах і дзвіночки-арпеджіо. 16 тактів
const winterChords = 'Em C G D Em C D B C D Bm Em Am C D D';
const winter = {
  bpm: 110,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.08, pattern: follow(prog(winterChords, 2), '0 . . . 2 . . . 0^ . . . 2 . . .') },
    { wave: 'square', vol: 0.016, pattern: follow(prog(winterChords, 5), '0 - 1 - 2 - 1 - 0^ - 2 - 1 - 2 -') },
    {
      wave: 'triangle',
      vol: 0.06,
      pattern: mel(
        '- - - - - - - - - - - - - - - -',
        '- - - - - - - - - - - - - - - -',
        '- - - - - - - - - - - - - - - -',
        '- - - - - - - - - - - - F#4 . A4 .',
        'B4 . . . E5 . . . G5 . F#5 . E5 . . .',
        'C5 . . . E5 . . . G5 . . . E5 . . .',
        'F#5 . . . E5 . D5 . A4 . . . D5 . . .',
        'D#5 . . . . . . . F#5 . . . B4 . . .',
        'G5 . . . E5 . . . C5 . . . E5 . . .',
        'F#5 . . . A5 . . . F#5 . . . D5 . . .',
        'B4 . . . D5 . . . F#5 . E5 . D5 . . .',
        'E5 . . . . . . . . . . . - - - -',
        'A4 . C5 . E5 . . . A5 . . . G5 . E5 .',
        'G5 . . . E5 . . . C5 . . . D5 . E5 .',
        'F#5 . . . . . . . D5 . . . A4 . . .',
        'D5 . . . - - - - F#4 . . . A4 . . .',
      ),
    },
    { wave: 'noise', vol: 0.025, pattern: times('k - h - h - h h - - h - h - h h', 16) },
  ],
};

// ---- Туманний бамбук: лад хірадзьоші від ля (A B C E F), 92 bpm. «Кото» — короткі щипки, «флейта» — довгі ноти
// у другій половині, барабан — бочка й рідкий обідок. 16 тактів (~42 с)
const koto = [
  'E5 - - - A4 - B4 - C5 - - - B4 - A4 -',
  'E5 - F5 - E5 - - - C5 - B4 - A4 - - -',
  'F5 - - - E5 - - - C5 - E5 - F5 - - -',
  'E5 - - - B4 - - - - - - - - - - -',
  'A5 - - - F5 - E5 - C5 - - - E5 - - -',
  'F5 - E5 - C5 - B4 - A4 - - - - - - -',
  'C5 - - - B4 - C5 - E5 - - - F5 - E5 -',
  'B4 - - - - - - - E4 - - - - - - -',
];
const bamboo = {
  bpm: 92,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.08, pattern: follow(prog(times('A5 A5 F5 E5', 4), 2), '0 . . . - - - - 0 - 0 - - - - -') },
    { wave: 'square', vol: 0.03, pattern: mel(...koto, '- - - - - - - - - - - - - - - -', koto[1], '- - - - - - - - - - - - - - - -', koto[3], koto[4], koto[5], koto[6], koto[7]) },
    {
      wave: 'triangle',
      vol: 0.05,
      pattern: mel(
        ...Array(8).fill('- - - - - - - - - - - - - - - -'),
        'E5 . . . . . . . . . . . - - - -',
        'F5 . . . E5 . . . C5 . . . B4 . . .',
        'A4 . . . . . . . . . . . - - - -',
        'B4 . . . . . . . C5 . B4 . . . . .',
        'E5 . . . . . . . . . . . - - - -',
        'F5 . . . E5 . . . C5 . . . E5 . . .',
        'B4 . . . . . . . C5 . . . B4 . . .',
        'A4 . . . . . . . - - - - - - - -',
      ),
    },
    { wave: 'noise', vol: 0.03, pattern: times('k - - - - - x - k - k - - - x -', 16) },
  ],
};

// ---- Лавові надра: мі фригійський, 132 bpm, пила восьмими — найважчий біом звучить найважче. 16 тактів (~29 с)
const lavaChords = 'E5 E5 F5 E5 E5 E5 G5 F5 C5 D5 E5 E5 C5 D5 F5 E5';
const lava = {
  bpm: 132,
  loop: true,
  voices: [
    { wave: 'sawtooth', vol: 0.03, pattern: follow(prog(lavaChords, 2), '0 - 0 - 0^ - 0 - 0 - 0 - 0^ - 1 -') },
    { wave: 'triangle', vol: 0.07, pattern: follow(prog(lavaChords, 2), '0 . . . . . . . 0 . . . 1 . . .') },
    {
      wave: 'square',
      vol: 0.032,
      pattern: mel(
        ...Array(4).fill('- - - - - - - - - - - - - - - -'),
        'E5 . . . F5 . . . G5 . . . F5 . E5 .',
        'B4 . . . . . . . C5 . B4 . A4 . . .',
        'G5 . F5 . E5 . . . C5 . . . D5 . . .',
        'E5 . . . . . . . - - - - - - - -',
        'C5 . E5 . G5 . . . E5 . C5 . G4 . . .',
        'D5 . F5 . A5 . . . F5 . D5 . A4 . . .',
        'B4 . . . E5 . . . F5 . . . G5 . . .',
        'F5 . . . E5 . . . - - - - - - - -',
        'C5 . . . G5 . . . F5 . E5 . C5 . . .',
        'D5 . . . A5 . . . G5 . F5 . D5 . . .',
        'F5 . . . G5 . . . A5 . . . C6 . . .',
        'B5 . . . . . . . E5 . . . . . . .',
      ),
    },
    { wave: 'noise', vol: 0.03, pattern: times('k - h - x - h - k k h - x - h h', 16) },
  ],
};


// ---- Трав'яні пагорби (біом 5): соль мажор, 104 bpm, пасторально — «сопілка» і перебір. 16 тактів (~37 с).
// Ніч настає посеред біому, а трек той самий: спокійна мелодія + вечірній мінор у середині (Em, Bm, Am).
const grassChords = 'G D Em C G D C D G Bm C G Am C D D';
const grass = {
  bpm: 104,
  loop: true,
  voices: [
    { wave: 'triangle', vol: 0.08, pattern: follow(prog(grassChords, 2), '0 . . . - - 2 . 1 . . . - - 2 .') },
    { wave: 'square', vol: 0.016, pattern: follow(prog(grassChords, 4), '- 0 - 1 - 2 - 1 - 0 - 1 - 2 - 1') },
    {
      wave: 'triangle',
      vol: 0.05,
      pattern: mel(
        '- - - - - - - - - - - - - - - -',
        '- - - - - - - - - - - - - - - -',
        'D5 . . . B4 . . . G4 . A4 . B4 . . .',
        'A4 . . . . . . . - - - - - - - -',
        'G4 . . . B4 . . . D5 . . . E5 . D5 .',
        'B4 . . . . . . . A4 . . . - - - -',
        'C5 . . . E5 . . . G5 . . . E5 . C5 .',
        'D5 . . . . . . . F#4 . . . A4 . . .',
        'G4 . . . . . . . - - - - - - - -',
        'F#4 . A4 . B4 . . . D5 . . . B4 . . .',
        'C5 . . . E5 . D5 . C5 . . . G4 . . .',
        'B4 . . . . . . . D5 . . . - - - -',
        'A4 . . . C5 . . . E5 . . . D5 . C5 .',
        'E5 . . . . . . . G4 . . . A4 . . .',
        'D5 . . . C5 . B4 . A4 . . . F#4 . . .',
        'A4 . . . . . . . - - - - - - - -',
      ),
    },
    { wave: 'noise', vol: 0.02, pattern: times('k - - - h - - - k - k - h - - -', 16) },
  ],
};

export const BIOME_TRACKS = { menu, cave, winter, bamboo, lava, grass };
