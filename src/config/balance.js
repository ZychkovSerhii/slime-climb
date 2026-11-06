// Усі числа балансу гри. Змінюй тут — сцени й сутності читають тільки звідси.
// Час — у секундах гри (sec) або мілісекундах (ms), відстані — у пікселях базової роздільності 720×1280.

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') deepFreeze(v);
  }
  return Object.freeze(obj);
}

export const BALANCE = deepFreeze({
  // Прокрутка світу (px/s)
  scrollBase: 120,
  scrollGrowth: 1.5, // приріст px/s за кожну секунду гри
  maxScrollSpeed: 520,
  bossScrollFactor: 0.3,

  // Очки
  pxPerPoint: 10,

  // Гравець
  playerSize: 48,
  playerYRatio: 0.7, // частка висоти екрана, на якій тримається гравець
  jumpDurationMs: 380,
  jumpArcPx: 80, // наскільки слизак підлітає вгору посеред стрибка
  maxLives: 2,
  invulnerableMs: 5000,
  invulnerableBlinkMs: 125, // півперіод блимання під час невразливості

  // Світ
  wallWidth: 60,
  spikeHeight: 40,
  spikeStartSec: 3, // перший шип не раніше цього часу

  // Зброя гравця
  fireIntervalMs: 1000,
  minFireIntervalMs: 250,
  projectileDamage: 1,
  projectileSpeed: 520,

  // Вороги: hp, досвід, очки, з якої секунди з'являються, швидкості
  enemies: {
    lion: { hp: 4, xp: 5, points: 50, from: 10, speed: 90, lungeSpeed: 420 },
    bat: { hp: 1, xp: 2, points: 20, from: 30, speed: 260 },
    plant: { hp: 2, xp: 3, points: 30, from: 45, fireMs: 2500, bulletSpeed: 220 },
    smallSpider: { hp: 1, xp: 1, points: 10, speed: 150 },
  },
  boss: {
    atSec: 120,
    hp: 30,
    telegraphMs: 1000,
    spawnMs: 4000,
    spawnCount: [2, 3],
    xp: 60,
    points: 1000,
  },

  // Спавн
  spawnBaseMs: { lion: 6000, bat: 4000, plant: 9000 },
  spawnMinFactor: 0.4, // інтервал спавну падає до цієї частки за spawnRampSec
  spawnRampSec: 180,

  // Досвід
  xpBase: 10,
  xpGrowth: 1.4,

  // Картки поліпшень
  cards: { attackSpeedFactor: 0.85, slowFactor: 0.6, slowBaseMs: 2000, slowStepMs: 1000 },

  // Захист від довгих кадрів (повернення з фону)
  maxDeltaMs: 50,
});
