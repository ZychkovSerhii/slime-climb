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
  scrollGrowth: 1.1, // приріст px/s за кожну секунду гри (v2: було 1.5 — гравці гинули одразу після 1-ї хвилини)
  maxScrollSpeed: 520,
  bossScrollFactor: 0.3,

  // Очки
  pxPerPoint: 10,

  // Гравець
  playerSize: 48,
  playerYRatio: 0.7, // частка висоти екрана, на якій тримається гравець
  jumpDurationMs: 380,
  jumpArcPx: 80, // наскільки слизак підлітає вгору посеред стрибка
  // Утримання пальця: стрибок стартує одразу, а поки палець тримається (до holdMaxMs) — подовжується і росте вгору
  holdMaxMs: 260,
  holdDurationMul: 1.6, // політ при повному утриманні: ×1.6 від jumpDurationMs
  holdArcMul: 2.2, // дуга при повному утриманні: ×2.2 від jumpArcPx
  maxLives: 3, // специфікація: 2; бот-плейтест показав, що з 2 до боса доживає хіба ідеальний гравець
  invulnerableMs: 5000,
  healPerLevel: 1, // скільки життів повертає кожен новий рівень (не більше maxLives)
  invulnerableBlinkMs: 125, // півперіод блимання під час невразливості

  // Світ
  wallWidth: 60,
  spikeHeight: 40,
  spikeSlackSec: 0.25, // запас на реакцію людини понад тривалість стрибка між сусідніми шипами
  spikeLeadSec: 2.5, // на старті екран уже заповнений шипами; перший доходить до слизака за стільки секунд
  // «Гребінка»: кілька шипів впритул на одній стіні, протилежна стіна в цей час вільна — треба лишитися на ній
  spikeComb: { chance: 0.12, minCount: 4, maxCount: 6, minGapSec: 8 },

  // Зброя гравця
  fireIntervalMs: 1000,
  minFireIntervalMs: 250,
  projectileDamage: 1,
  projectileSpeed: 572, // v2: +10% влучності (було 520)
  projectileHitboxMul: 1.1, // v2: +10% влучності — хітбокс снаряда більший
  offscreenMarginPx: 100, // за цією межею від краю екрана снаряди й вороги знищуються

  // Вороги: hp, досвід, очки, з якої секунди з'являються, швидкості
  enemies: {
    // лев: біг пришвидшено (було 90), ривок стартує, коли лев на lungeBelowPx нижче за гравця (раніше — на середині екрана, і його встигали вбити до ривку)
    lion: { hp: 4, xp: 5, points: 50, from: 10, speed: 150, lungeSpeed: 480, windupMs: 450, lungeBelowPx: 220, biteRangePx: 130 },
    bat: { hp: 1, xp: 2, points: 20, from: 30, speed: 312 }, // v2: +20% (було 260)
    plant: { hp: 4, xp: 3, points: 30, from: 45, fireMs: 2500, bulletSpeed: 264 }, // v2: hp 2→4, куля +20%
    smallSpider: { hp: 1, xp: 1, points: 10, speed: 150 },
  },
  boss: {
    name: 'Твоя мамаша',
    atSec: 120,
    hp: 40, // v2: було 30
    xp: 60,
    points: 1000,
    // Підготовка: за prepSec до боса шипи й вороги зникають і не з'являються; плашка — останні bannerSec
    prepSec: 4,
    bannerSec: 2,
    calmSec: 6, // після смерті боса стільки секунд нічого небезпечного
    // далі інтервали спавну ворогів ×rampMul і за rampSec плавно повертаються до звичайних
    afterRampMul: 2,
    afterRampSec: 20,
    // Фаза 1: тінь-попередження, потім удар на павутині
    telegraphMs: 1000,
    strikeChance: 0.6, // імовірність удару прямо над гравцем
    strikeSpreadPx: 40, // розкид такого удару по x
    hangY: 260, // на якій висоті павук висить між атаками (px від верху) — нижче смуги HP у HUD
    dropSpeed: 900, // швидкість падіння на павутині (px/s)
    retreatSpeed: 500, // швидкість підйому (px/s)
    restMs: 800, // пауза між атаками
    // Фаза 2 — рій: на swarmAt частці HP павучиха стає по центру, невразлива, і випускає рій
    swarmAt: 0.75,
    swarm: { start: 12, growth: 1, max: 20, pauseMs: 1500, speed: 330, homingStopPx: 260, spreadPx: 70 },
    poison: { durationMs: 10000, speedMul: 0.85 }, // дотик павучка рою: слизак повільніший
    // Лють: поріг випадковий у [rageMin, rageMax] частки HP; атаки швидші в rageSpeedMul раз
    rageMin: 0.35,
    rageMax: 0.4,
    rageSpeedMul: 1.35,
    debugAtSec: 6, // старт боса з параметром ?boss=1 (для перевірки)
  },

  // Спавн
  spawnBaseMs: { lion: 6000, bat: 4000, plant: 9000 },
  spawnMinFactor: 0.4, // інтервал спавну падає до цієї частки за spawnRampSec
  spawnRampSec: 180,

  // Досвід
  xpBase: 10,
  xpGrowth: 1.4,

  // Картки поліпшень
  // damageFirst — перше взяття «Урону», damageNext — кожне наступне
  cards: { attackSpeedFactor: 0.85, slowFactor: 0.6, slowBaseMs: 2000, slowStepMs: 1000, damageFirst: 1, damageNext: 2 },

  // Зброя з прогресом (етап 4a). Повністю вкачана зброя стає основною й замінює попередню.
  // damageMul множить поточну шкоду пострілу (база + бонус карток «Урон»).
  weapons: {
    // ближній бій: розмах по колу радіусом radiusFrac ширини екрана; б'є лише коли хтось у радіусі
    // intervalMul — [рішення] у специфікації частоти немає: розмах у 1,5 раза рідше за постріл
    // triggerFrac — [рішення] розмах, коли ціль ближче за цю частку радіуса: б'є по всьому радіусу,
    // тож зграя рою потрапляє під удар майже вся, а не лише передній павучок
    axe: { name: 'Сокира Рагнара', steps: 3, damageMul: 4, radiusFrac: 1 / 3, triggerFrac: 0.55, intervalMul: 1.5, swingMs: 240 },
    // черга з burst пострілів через burstGapMs, потім перезарядка ×reloadMul; стрибки швидші
    chakra: { name: 'Ворота чакри', steps: 5, burst: 8, burstGapMs: 70, reloadMul: 2, jumpSpeedMul: 1.5 },
    // 3 кулі: у ціль і дві під ±spreadDeg від неї
    shotgun: { name: 'Дробовик Хулігана', steps: 3, damageMul: 1.25, spreadDeg: 25 },
  },

  // Захист від довгих кадрів (повернення з фону)
  maxDeltaMs: 50,
  // Після закриття вікна LevelUp тапи для стрибка ігноруються стільки мс (захист від «протікання» тапу)
  tapGuardMs: 200,
});
