// Баланс біому 5 «Трав'яні пагорби» і боса «Мрець-Велетень» (дизайн — docs/superpowers/specs/2026-11-21-grass-biome-design.md).
// Частина BALANCE: balance.js підключає це як BALANCE.enemies.<моб>, BALANCE.grass і BALANCE.zombie. Читай завжди через BALANCE.
// Числа з ТЗ позначені «ТЗ», решта — [Claude] (рішення без відповіді користувача, легко міняються тут).

export const GRASS_ENEMIES = {
  // ---- Трав'яні пагорби (біом 5, docs/superpowers/specs/2026-11-21-grass-biome-design.md). HP і швидкості — ТЗ, решта — [Claude].
  // Волохань: згори вниз по стіні без гравця; на lungeYFrac висоти екрана блимає windupMs і стрибає в точку гравця.
  // Промахнувся й вилетів живим — returns разів з'являється згори на іншій стіні й стрибає знову.
  hairySpider: { hp: 30, xp: 4, points: 40, speed: 359, lungeSpeed: 560, lungeYFrac: 0.55, windupMs: 400, returns: 1, scale: 1.3 },
  // Лучник у каптурі: ходить по стіні без гравця у верхній половині (minYFrac…maxYFrac), стріла раз на fireMs, перед нею
  // блимає windupMs; стріляє, лише коли вище за гравця на minAbovePx (як квітка — від стріли рятує стрибок). За lifeMs іде вгору.
  archer: { hp: 25, xp: 4, points: 40, speed: 240, fireMs: 2000, firstShotMs: 700, windupMs: 300, arrowSpeed: 330,
    minYFrac: 0.1, maxYFrac: 0.42, minAbovePx: 200, lifeMs: 11000 },
  // Лучник верхи на Волохані: hp разом; після spiderHp шкоди павук гине, лучник лишається з рештою HP (рішення користувача)
  rider: { hp: 60, spiderHp: 30, xp: 8, points: 80 },
  // Пшикач (вибуховик): згори по стіні гравця до нього; за fusePx «пш-ш» fuseMs (повзе далі на creepSpeed) і вибух.
  // Ближче contactPx (тіла майже торкаються) — мінус contactDamage життів, у radiusPx — мінус 1. Убитий до вибуху — без вибуху.
  puffball: { hp: 20, xp: 3, points: 30, speed: 420, fusePx: 150, fuseMs: 900, creepSpeed: 110, radiusPx: 110, contactPx: 56, contactDamage: 3 },
  // Малий мрець (Мрець-Велетень на 65%): згори на гравця; ближче homingStopPx перестає доворачувати
  zombieMini: { hp: 20, xp: 2, points: 20, speed: 200, homingStopPx: 170 },
};

// ---- Біом 5 «Трав'яні пагорби» (після Казана). Спавн ×0,9 від лави [Claude]; Пшикач і вершник — не більше одного на екрані.
// day/night [Claude]: сонце йде зліва направо dayMs, далі місяць і ніч до кінця біому (без світанку); ніч — темний шар alpha
// над фоном і стінами, але ПІД ворогами, кулями й кущами (загрози видно). fadeMs — перехід у ніч.
export const GRASS = {
  from: { hairySpider: 3, archer: 8, puffball: 12, rider: 30 }, // вершник — з 30-ї с (ТЗ)
  spawnBaseMs: { hairySpider: 7070, archer: 10020, puffball: 11000, rider: 14000 },
  night: { dayMs: 90000, fadeMs: 5000, alpha: 0.35, color: 0x0a1030 },
  transitionMs: 1500,
};

// ---- Бос 5 «Мрець-Велетень» (біом 5; ТЗ — HP, швидкості, фази; решта — [Claude]). Частки HP — від maxHp.
export const ZOMBIE = {
  name: 'Мрець-Велетень',
  scale: 3, // спрайт 96×128 → 288×384 (≈3 павучихи завширшки, 4 заввишки)
  bodyW: 160, bodyH: 190, // хітбокс — лише тулуб угорі: інакше він перекрив би прохід
  afterSec: 180, // через стільки секунд після початку трави (= смерті Казана)
  hp: 700, // ТЗ
  xp: 140,
  points: 3000,
  speed: 120, // ТЗ: повільно; гойдається вбік на speed px/с у межах ±swayPx
  swayPx: 80,
  hoverAbovePx: 230, // низ тулуба на стільки вище за гравця (найвища дуга стрибка — 176 px)
  phases: { summon: 0.65, hen: 0.4 },
  strike: { everyMs: 2800, warnMs: 700, hitMs: 260, wPx: 240, hPx: 400 }, // смуга на стіні гравця: ×3 ширша й ×4 довша за удар павучихи
  summon: { count: 10, perWave: 2, gapMs: 600 },
  flesh: { chance: 0.4, tempChance: 0.9, tempMs: 15000 }, // гнила плоть з малого мерця (ТЗ)
  hen: { hp: 230, speed: 700, dodgePx: 90, dodgeNearPx: 120, dodgeCdMs: 1200, swayPx: 150 },
  after: { speedMul: 2, strikeMul: 1.5 }, // курка загинула: 240 і удари в 1,5 раза частіше (ТЗ)
  debugAtSec: 6, // ?zombie=1
};
