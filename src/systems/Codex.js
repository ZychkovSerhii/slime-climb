// Довідник (етап 7, специфікація §7). Чисті функції без Phaser і без DOM.
// Усі числа беруться з BALANCE і текстів карток (CardText.js), тож довідник не застаріває, коли міняється баланс.
// Новий ворог / зброя / скін: додай запис у відповідний список нижче. Тест перевіряє, що нічого з BALANCE не забуто.
// Досягнення в довідник не входять: вони приховані за задумом.
import { BALANCE } from '../config/balance.js';
import { cardText, LOOT_TEXT, WEAPON_DESC } from './CardText.js';
import { CARD_IDS, weaponCard } from './Progression.js';
import { invisStats, LOOT_IDS, lootCard } from './Skills.js';
import { SHKODKO_LOOT_IDS } from './ShkodkoLoot.js';
import { KOLYA_LOOT_IDS } from './KolyaLoot.js';
import { KAZAN_LOOT_IDS } from './KazanLoot.js';
import { ENEMIES } from './CodexEnemies.js';

export const CATEGORIES = [
  { id: 'character', name: 'Персонаж' },
  { id: 'weapon', name: 'Зброя' },
  { id: 'skill', name: 'Скіли' },
  { id: 'loot', name: 'Унікальні картки' },
  { id: 'enemy', name: 'Вороги' },
  { id: 'boss', name: 'Боси' },
  { id: 'biome', name: 'Біоми' },
  { id: 'skin', name: 'Скіни' },
];

export const BIOMES = { cave: 'Печера', winter: 'Зима', bamboo: 'Туманний бамбук', lava: 'Лавові надра' };

export const SORTS = [
  { id: 'category', name: 'Категорія' }, // порядок buildCodex: персонаж, зброя, … скіни
  { id: 'name', name: 'Назва' },
  { id: 'hp', name: 'HP' },
  { id: 'damage', name: 'Шкода' },
  { id: 'speed', name: 'Швидкість' },
  { id: 'biome', name: 'Біом' },
];

const E = BALANCE.enemies;
const W = BALANCE.winter;
const sec = (ms) => String(Math.round(ms / 10) / 100).replace('.', ',');
const num = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
const pct = (x) => Math.round(x * 100);
// тексти карток у грі місцями з крапкою (1.2 с) — у довіднику кома, як в українській
const oneLine = (s) => s.replace(/\n/g, ' ').replace(/(\d)\.(\d)/g, '$1,$2');

/**
 * Запис: { id, category, name, sprite (ключ спрайта або null), biome (cave|winter|null),
 *          hp, damage, speed (числа або null — тоді в сортуванні йдуть у кінець), desc, facts: [рядки] }.
 */
function entry(e) {
  return { sprite: null, biome: null, hp: null, damage: null, speed: null, facts: [], ...e };
}

function character() {
  return [
    entry({
      id: 'slime',
      category: 'character',
      name: 'Слизак',
      sprite: 'slime',
      hp: BALANCE.maxLives,
      desc: 'Стрибає між стінами вгору й стріляє сам. Тап — стрибок, утримання — довший і вищий стрибок.',
      facts: [
        `Життя: ${BALANCE.maxLives} (картками — до ${BALANCE.skills.extraLife.maxLives})`,
        `Після удару невразливий ${sec(BALANCE.invulnerableMs)} с`,
        `До ${BALANCE.healLateFrom} рівня кожен новий рівень повертає ${BALANCE.healPerLevel} життя, далі — кожен другий`,
        `Стрибок: ${sec(BALANCE.jumpDurationMs)} с, з утриманням ×${num(BALANCE.holdDurationMul)} довше`,
        `Заряджений стрибок (утримання): сідає на ${BALANCE.charge.liftPx} px вище й сповзає на місце; раз на ${sec(BALANCE.charge.cooldownMs)} с — шкала під слизаком`,
      ],
    }),
    entry({
      id: 'heart',
      category: 'character',
      name: 'Сердечко',
      sprite: 'heart',
      desc: 'З\'являється на одній зі стін і їде разом з нею. Торкнися — +1 життя.',
      facts: [
        `З ${BALANCE.heart.firstSec}-ї секунди гри, далі раз на ${BALANCE.heart.minSec}–${BALANCE.heart.maxSec} с`,
        'Коли життя повні — не з\'являється',
        'У бою з босом — щонайбільше одне',
        'Поруч на стіні шипів не буває',
      ],
    }),
  ];
}

function weapons() {
  const start = entry({
    id: 'weapon:start',
    category: 'weapon',
    name: 'Стартовий постріл',
    sprite: 'projectile',
    damage: BALANCE.projectileDamage,
    speed: BALANCE.projectileSpeed,
    desc: 'Куля в найближчого ворога. З нею починається кожен забіг.',
    facts: [`Постріл раз на ${sec(BALANCE.fireIntervalMs)} с (картками — до ${sec(BALANCE.minFireIntervalMs)} с)`],
  });
  const sprites = { axe: 'axe', chakra: 'chakraVeins', shotgun: 'shotgun', lightning: 'staffBolt', fire: 'staffFire', boomerang: 'boomerang' };
  const damage = Object.fromEntries(Object.entries(BALANCE.weapons).map(([id, w]) => [id, BALANCE.projectileDamage * (w.damageMul ?? 1)]));
  // етап 14: що зброя вміє з рівнем (поведінка міняється, а не лише цифри)
  const W = BALANCE.weaponUpgrades;
  const paths = {
    shotgun: [`З ${W.shotgun.extraAt}-ї прокачки — 5 куль`, `З ${W.shotgun.ricochetAt}-ї — рикошет від стін (×${num(W.shotgun.ricochetMul)} шкоди)`],
    lightning: [`Перескоків більше з ${W.lightning.moreAt.join('-ї і ')}-ї прокачки`, `З ${W.lightning.stunAt}-ї — вражені застигають (крім босів)`, `З ${W.lightning.blastAt}-ї — вибух у кінці ланцюга`],
    fire: [`Горіння сильніше й довше з кожною прокачкою`, `З ${W.fire.spreadAt}-ї — вогонь перекидається на сусіда`, `З ${W.fire.explodeAt}-ї — згорілий ворог вибухає`],
    boomerang: [`Летить далі з кожною прокачкою`, `З ${W.boomerang.twinAt}-ї — два бумеранги`, `З ${W.boomerang.shieldAt}-ї — повернувшись, крутиться над слизаком щитом`],
  };
  const U = BALANCE.weaponUpgrades;
  const list = Object.entries(BALANCE.weapons).map(([id, w]) =>
    entry({
      id: weaponCard(id),
      category: 'weapon',
      name: w.name,
      sprite: sprites[id] ?? null,
      damage: damage[id] ?? null,
      speed: id === 'axe' || id === 'lightning' ? null : id === 'boomerang' ? w.speed : BALANCE.projectileSpeed,
      desc: oneLine(WEAPON_DESC[id](w)),
      facts: [
        `Відкривається за ${w.steps} карток`,
        'Два слоти: стандартна атака й зброя; нова — замість слота на твій вибір, перемикання кнопкою',
        `Прокачка без межі: +${num(U[id]?.damageAdd ?? U.damageAdd)} шкоди за кожну; рівень зберігається, навіть якщо зброю викинули`,
        ...(paths[id] ?? []),
      ],
    }),
  );
  return [start, ...list];
}

const SKILL_SPRITES = { slow: 'frost', hat: 'hat', shuriken: 'orbitShuriken', extraLife: 'heart', invisibility: 'slime', halfblood: 'slimeSpider' };

function skills() {
  return CARD_IDS.map((id) => {
    const t = cardText(id, {}, null);
    const facts = [];
    let damage = null;
    if (id === 'hat') {
      const H = BALANCE.skills.hat;
      damage = H.damageSteps[0];
      facts.push(`До ${H.maxPicks} взять, з ${H.secondAt}-го — друга шляпа`);
      facts.push(`Шкода росте: ${H.damageSteps.map((_, i) => H.damageSteps.slice(0, i + 1).reduce((a, b) => a + b, 0)).join(' → ')}`);
    }
    if (id === 'shuriken') {
      const R = BALANCE.skills.shuriken;
      damage = R.damageSteps[0];
      facts.push(`До ${R.maxPicks} взять: сюрикенів ${R.counts.join(' → ')}, шкода ${R.damageSteps.map((_, i) => R.damageSteps.slice(0, i + 1).reduce((a, b) => a + b, 0)).join(' → ')}`);
      facts.push(`Шкода росте з біомом, як HP ворогів; «Урон» її не посилює`);
      facts.push(`Одного ворога ріже не частіше, ніж раз на ${sec(R.hitCdMs)} с${R.bossMul < 1 ? '; боса — слабше' : ', боса — так само'}`);
    }
    if (id === 'damage') {
      damage = BALANCE.cards.damageFirst;
      facts.push(`Перше взяття +${BALANCE.cards.damageFirst}, кожне наступне +${BALANCE.cards.damageNext}`);
    }
    if (id === 'slow') {
      damage = BALANCE.ice.dps;
      facts.push(`Кожне наступне взяття сильніше: до −${pct(1 - BALANCE.ice.minFactor)}% швидкості`);
    }
    if (id === 'invisibility') {
      const best = invisStats(99);
      facts.push(`Перезарядка з кожним взяттям коротша, до ${sec(best.cooldownMs)} с`);
    }
    if (id === 'halfblood') facts.push('Раз за забіг; з\'являється, коли вже є хоч одна трансформація');
    if (id === 'attackSpeed') facts.push(`Не частіше, ніж раз на ${sec(BALANCE.minFireIntervalMs)} с`);
    return entry({ id, category: 'skill', name: t.title, sprite: SKILL_SPRITES[id] ?? null, damage, desc: oneLine(t.desc), facts });
  });
}

const LOOT_SPRITES = { oksana: 'smallSpider', web: 'webShot', form: 'slimeSpider', sack: 'sack', iam: 'slimeShkodko', larva: 'larva', iamkolya: 'slimeKolya', ladle: 'ladle', iamkazan: 'slimeKazan' };

function loot() {
  const make = (id, from) => {
    const t = LOOT_TEXT[id]();
    let damage = null;
    if (id === 'oksana') damage = BALANCE.bossLoot.oksana.damage;
    if (id === 'venom') damage = BALANCE.bossLoot.venom.dps;
    if (id === 'sack') damage = BALANCE.shkodkoLoot.bomb.damage;
    if (id === 'iam') damage = BALANCE.shkodkoLoot.iam.bombDamage;
    if (id === 'larva') damage = BALANCE.kolyaLoot.larva.damage;
    if (id === 'ladle') damage = BALANCE.kazanLoot.ladle.damage;
    if (id === 'iamkazan') damage = BALANCE.kazanLoot.iam.damage;
    return entry({
      id: lootCard(id),
      category: 'loot',
      name: t.title,
      sprite: LOOT_SPRITES[id] ?? null,
      damage,
      desc: oneLine(t.desc),
      facts: [from],
    });
  };
  return [
    ...LOOT_IDS.map((id) => make(id, `Трофей з «${BALANCE.boss.name}»: ${BALANCE.bossLoot.offer} картки на вибір, кожна раз за забіг`)),
    ...SHKODKO_LOOT_IDS.map((id) => make(id, `Трофей з «${BALANCE.shkodko.name}»: 1 з ${BALANCE.shkodkoLoot.offer}, невзята лишається на наступне коло`)),
    ...KOLYA_LOOT_IDS.map((id) => make(id, `Трофей з «${BALANCE.kolya.name}»: 1 з ${BALANCE.kolyaLoot.offer}, невзята лишається на наступне коло`)),
    ...KAZAN_LOOT_IDS.map((id) => make(id, `Трофей з «${BALANCE.kazan.name}»: 1 з ${BALANCE.kazanLoot.offer}, невзята лишається на наступне коло`)),
  ];
}

// Властивості посилених ворогів з 2-го кола (етап 10, §10.1)
const T = BALANCE.traits;
const BB = BALANCE.bearBoss;
const Z = BALANCE.kazan;
const TRAIT_TEXT = {
  lion: () => 'після промаху — другий ривок',
  bat: () => `зависає на ${sec(T.bat.hoverMs)} с і пікірує`,
  plant: () => `віяло з ${T.plant.fan} куль`,
  elf: () => `${T.elf.candies} льодяники поспіль`,
  penguin: () => 'летять парою',
  ninja: () => `${T.ninja.shurikens} сюрикени поспіль`,
  lantern: () => `вибух ×${num(T.lantern.radiusMul)} ширший`,
  slugBiter: () => `×${num(T.slugBiter.speedMul)} швидший`,
  slugSpitter: () => `плює раз на ${sec(T.slugSpitter.spitMs)} с`,
  salamander: () => `дихає ${T.salamander.breaths} рази поспіль`,
  spark: () => `розпадається на ${T.spark.splits} дрібні`,
};

function enemies() {
  const list = Object.entries(ENEMIES).map(([id, info]) => {
    const i = info();
    const facts = [...(i.facts ?? [])];
    if (TRAIT_TEXT[id]) facts.push(`З 2-го кола посилений (контур): ${TRAIT_TEXT[id]()}`);
    if (id !== 'santa') facts.unshift('Дотик — мінус 1 життя');
    facts.push(`Досвід: ${E[id].xp}, Шаги: ${BALANCE.meta.stepsPerKill[id] ?? 0}`);
    const sprite = { wagon: 'wagon', slugBiter: 'slug', slugSpitter: 'slug' }[id] ?? id;
    return entry({ id: `enemy:${id}`, category: 'enemy', sprite, hp: i.hp ?? E[id].hp, ...i, facts });
  });
  const hazards = [
    entry({
      id: 'enemy:winterBat',
      category: 'enemy',
      name: W.bat.name,
      sprite: 'bat',
      biome: 'winter',
      hp: W.bat.hp,
      speed: Math.round(E.bat.speed * W.bat.speedMul),
      desc: 'Зимовий кажан з холодним відливом. Летить прямо на тебе згори, міцніший за печерного.',
      facts: ['Дотик — мінус 1 життя', `Прилітає парою на допомогу «${BALANCE.bearBoss.name}»`, `З 2-го кола посилена (контур): ${TRAIT_TEXT.bat()}`],
    }),
    // фідбек-9: свої миші бамбуку й лави
    ...[['bambooBat', 'bamboo', 'Зелена, з листочками бамбуку на крилах. Швидша й міцніша за зимову.'],
      ['lavaBat', 'lava', 'Розпечена миша надр. Найшвидша й найміцніша з мишей.']].map(([id, biome, desc]) => entry({
      id: `enemy:${id}`,
      category: 'enemy',
      name: BALANCE[biome].bat.name,
      sprite: BALANCE[biome].bat.sprite,
      biome,
      hp: BALANCE[biome].bat.hp,
      speed: BALANCE[biome].bat.speed,
      desc: `${desc} Летить прямо на тебе згори.`,
      facts: ['Дотик — мінус 1 життя', `З 2-го кола посилена (контур): ${TRAIT_TEXT.bat()}`],
    })),
    entry({
      id: 'enemy:spike',
      category: 'enemy',
      name: 'Шип',
      sprite: 'spike',
      biome: 'cave',
      desc: 'Стирчить зі стіни. Не вбивається: перестрибни на іншу стіну.',
      facts: ['Дотик — мінус 1 життя', 'Інколи кілька шипів підряд на одній стіні — тоді лишайся на протилежній'],
    }),
    entry({
      id: 'enemy:icicle',
      category: 'enemy',
      name: 'Бурулька',
      sprite: 'icicle',
      biome: 'winter',
      desc: 'Зимовий шип: так само стирчить зі стіни.',
      facts: ['Дотик — мінус 1 життя'],
    }),
    entry({
      id: 'enemy:stake',
      category: 'enemy',
      name: 'Бамбуковий кілок',
      sprite: 'stake',
      biome: 'bamboo',
      desc: 'Шип бамбукових стін: так само стирчить зі стіни.',
      facts: ['Дотик — мінус 1 життя'],
    }),
    entry({
      id: 'enemy:shuriken',
      category: 'enemy',
      name: 'Сюрикен',
      sprite: 'shuriken',
      biome: 'bamboo',
      speed: E.ninja.shurikenSpeed,
      desc: 'Його кидають ніндзя. Летить по прямій туди, де ти був.',
      facts: ['Дотик — мінус 1 життя'],
    }),
    entry({
      id: 'enemy:spit',
      category: 'enemy',
      name: 'Крапля слизу',
      sprite: 'slimeSpit',
      biome: 'bamboo',
      speed: BALANCE.kolya.spit.speed,
      desc: `Нею плюються «${BALANCE.kolya.name}», його уламки й личинки-стрільці. Летить туди, де ти був.`,
      facts: ['Дотик — мінус 1 життя'],
    }),
    entry({
      id: 'enemy:basalt',
      category: 'enemy',
      name: 'Базальтовий кілок',
      sprite: 'basalt',
      biome: 'lava',
      desc: 'Шип лавових стін: так само стирчить зі стіни.',
      facts: ['Дотик — мінус 1 життя'],
    }),
    entry({
      id: 'enemy:lavaDrop',
      category: 'enemy',
      name: 'Лавова крапля',
      sprite: 'lavaDrop',
      biome: 'lava',
      speed: BALANCE.lava.drop.speed,
      desc: `Набухає ${sec(BALANCE.lava.drop.swellMs)} с на верхньому краю стіни і стікає нею вниз. Не вбивається: перестрибни на іншу стіну.`,
      facts: ['Дотик — мінус 1 життя', 'На обох стінах одночасно не буває', 'Під час бою з Казаном не падає'],
    }),
    entry({
      id: 'enemy:magma',
      category: 'enemy',
      name: 'Крапля магми',
      sprite: 'magma',
      biome: 'lava',
      speed: BALANCE.kazan.magma.speed,
      desc: `Нею плюється «${BALANCE.kazan.name}». Летить дугою туди, де ти був.`,
      facts: ['Дотик — мінус 1 життя'],
    }),
    entry({
      id: 'enemy:lid',
      category: 'enemy',
      name: 'Кришка Казана',
      sprite: 'lid',
      biome: 'lava',
      desc: `«${BALANCE.kazan.name}» кидає її бумерангом через коридор на твоїй висоті. Перед кидком ${sec(BALANCE.kazan.lid.warnMs)} с видно лінію.`,
      facts: ['Дотик — мінус 1 життя', 'Повертається тим самим шляхом — рятує стрибок'],
    }),
    entry({
      id: 'enemy:candy',
      category: 'enemy',
      name: 'Льодяник',
      sprite: 'candy',
      biome: 'winter',
      speed: E.elf.candySpeed,
      desc: 'Його кидають ельфи і Шкодько. Летить по прямій туди, де ти був.',
      facts: ['Дотик — мінус 1 життя'],
    }),
  ];
  return [...list, ...hazards];
}

function bosses() {
  const B = BALANCE.boss;
  const S = BALANCE.shkodko;
  const c = BALANCE.cycle;
  const cycleFact = `Кожне наступне коло: HP ×${num(BALANCE.scaling.bossHpMul)}, швидкість ×${num(c.speedMul)}; з 2-го кола — додаткова атака`;
  return [
    entry({
      id: 'boss:spider',
      category: 'boss',
      name: B.name,
      sprite: 'spider',
      biome: 'cave',
      hp: B.hp,
      speed: B.dropSpeed,
      desc: 'Павучиха. Падає на павутині туди, де тінь, і плюється грудками павутини. Потім випускає рій павучків.',
      facts: [
        `Приходить на ${Math.floor(B.atSec / 60)}:${String(B.atSec % 60).padStart(2, '0')} гри`,
        `На ${pct(B.swarmAt)}% HP — рій: поки він живий, павучиха невразлива`,
        `На ${pct(B.rageMin)}–${pct(B.rageMax)}% HP — лють: атаки в ${num(B.rageSpeedMul)} раза швидші`,
        `Нагорода: ${BALANCE.meta.stepsPerKill.boss} Шагів і трофей`,
        cycleFact,
      ],
    }),
    entry({
      id: 'boss:bear',
      category: 'boss',
      name: `${BB.name} (міні-бос)`,
      sprite: 'bear',
      biome: 'winter',
      hp: BB.hp,
      speed: BB.jump.speed,
      desc: 'Величезний білий ведмідь. Повзає по стінах, присідає і стрибає туди, де ти стоїш, а вилетівши за край, стрибає знову з іншого боку.',
      facts: [
        `Приходить через ${sec(BB.afterSec * 1000)} с після перемоги над «${B.name}», раз за кожну зиму`,
        `Перед стрибком присідає на ${sec(BB.jump.warnMs)} с і показує стрілку — стрибай на іншу стіну`,
        `Ричить: аура з ${BB.aura.hp} HP захищає його від куль ${sec(BB.aura.ms)} с або поки її не розбили; дотик до аури сповільнює`,
        `На ${pct(BB.batsAt)}% HP прилітають ${BB.bats} «${W.bat.name}»`,
        `Нагорода: ${BALANCE.meta.stepsPerKill.bear} Шагів`,
        cycleFact,
      ],
    }),
    entry({
      id: 'boss:shkodko',
      category: 'boss',
      name: S.name,
      sprite: 'shkodko',
      biome: 'winter',
      hp: S.hp,
      speed: S.dance.p1.speed,
      desc: 'Зелений гоблін у шапці-ялинці. Танцює, кидає подарунки-бомби й льодяники, а наприкінці сідає на потяг.',
      facts: [
        `Приходить через ${Math.floor(S.afterSec / 60)} хв після перемоги над «${B.name}» (і не раніше ніж через ${BB.shkodkoGapSec} с після ведмедя)`,
        'На початку кидається на тебе втричі швидше й кусає — перед ривком блимає',
        `Подарунковий дощ: збери ${S.rush.goal} з ${S.rush.count}, поки він кидає цукерки, інакше він лікується на ${pct(S.rush.healFail)}%`,
        `Потяг-змійка з ${S.train.wagons} вагонів пірнає до тебе вздовж стіни — стрілка показує куди`,
        'Розбив вагони — одразу лютує: бігає по карті й кидає цукерки',
        `Нагорода: ${BALANCE.meta.stepsPerKill.shkodko} Шагів і трофей`,
        cycleFact,
      ],
    }),
    entry({
      id: 'boss:kolya',
      category: 'boss',
      name: BALANCE.kolya.name,
      sprite: 'kolya',
      biome: 'bamboo',
      hp: BALANCE.kolya.hp,
      speed: BALANCE.kolya.lunge.speed,
      desc: 'Великий рожевий слимак з ріжками-очима. Повзе змійкою, робить ривки туди, де ти стоїш, плюється слизом.',
      facts: [
        `Приходить через ${Math.floor(BALANCE.kolya.afterSec / 60)} хв після перемоги над «${S.name}»`,
        `Перед ривком стискається на ${sec(BALANCE.kolya.lunge.warnMs)} с — стрибай на іншу стіну`,
        `На ${pct(BALANCE.kolya.phases.birth)}% HP народжує малих слимаків, на ${pct(BALANCE.kolya.phases.split)}% — ділиться на ${BALANCE.kolya.split.parts}`,
        `Останній уламок з'їдає рештки, лікується до ${pct(BALANCE.kolya.eat.healTo)}% і впадає в лють`,
        `Нагорода: ${BALANCE.meta.stepsPerKill.kolya} Шагів і трофей`,
        cycleFact,
      ],
    }),
    entry({
      id: 'boss:kazan',
      category: 'boss',
      name: Z.name,
      sprite: 'kazan',
      biome: 'lava',
      hp: Z.hp,
      desc: 'Живий чавунний казан з кришкою-капелюхом і вусами з пари. Висить угорі, виливає лаву на стіни, плюється магмою й кидає кришку.',
      facts: [
        `Приходить через ${Math.floor(Z.afterSec / 60)} хв після перемоги над «${BALANCE.kolya.name}»`,
        `Перед виливанням стіна жевріє ${sec(Z.pour.warnMs)} с — стрибай на іншу; лава ніколи не на обох стінах`,
        `На ${pct(Z.phases.boil)}% HP закипає: ${Z.boil.bubbles} бульбашки, а сам ${sec(Z.boil.idleMs)} с стоїть і вразливий`,
        `На ${pct(Z.phases.rage)}% HP — лють: виливає по черзі на обидві стіни, між ними ${sec(Z.rage.gapMs)} с обидві вільні`,
        'З 2-го кола після виливання на стіні лишається калюжа',
        `Нагорода: ${BALANCE.meta.stepsPerKill.kazan} Шагів і трофей`,
        cycleFact,
      ],
    }),
  ];
}

function biomes() {
  const names = (ids) => ids.map((id) => ENEMIES[id]().name).join(', ');
  return [
    entry({
      id: 'biome:cave',
      category: 'biome',
      name: BIOMES.cave,
      sprite: 'wall',
      biome: 'cave',
      desc: `Перший біом. Тут чекає бос «${BALANCE.boss.name}».`,
      facts: [`Вороги: ${names(['lion', 'bat', 'plant'])}`, 'Пастки: шипи'],
    }),
    entry({
      id: 'biome:winter',
      category: 'biome',
      name: BIOMES.winter,
      sprite: 'wallIce',
      biome: 'winter',
      desc: `Настає після перемоги над «${BALANCE.boss.name}». Тут чекає бос «${BALANCE.shkodko.name}».`,
      facts: [
        `Вороги: ${names(['elf', 'penguin', 'snowball'])}, ${W.bat.name}; міні-бос «${BB.name}»`,
        'Пастки: бурульки, льодяники',
        `Подарунок: випадково досвід (${pct(W.gift.xpShare)}% рівня), ${W.gift.steps} Шаги, щит на ${sec(W.gift.shieldMs)} с або рідко +1 життя`,
        'Сніг вимикається в меню',
        `Після Шкодька — ${BIOMES.bamboo}`,
      ],
    }),
    entry({
      id: 'biome:bamboo',
      category: 'biome',
      name: BIOMES.bamboo,
      sprite: 'wallBamboo',
      biome: 'bamboo',
      desc: `Настає після перемоги над «${BALANCE.shkodko.name}». Тут чекає бос «${BALANCE.kolya.name}».`,
      facts: [
        `Вороги: ${names(['ninja', 'lantern', 'bat'])}`,
        'Пастки: бамбукові кілки, сюрикени',
        'Туман лише на фоні, вимикається в меню',
        `Після Колі — ${BIOMES.lava}`,
      ],
    }),
    entry({
      id: 'biome:lava',
      category: 'biome',
      name: BIOMES.lava,
      sprite: 'wallLava',
      biome: 'lava',
      desc: `Настає після перемоги над «${BALANCE.kolya.name}». Тут чекає бос «${BALANCE.kazan.name}».`,
      facts: [
        `Вороги: ${names(['salamander', 'spark', 'bat'])}`,
        'Пастки: базальтові кілки, лавові краплі',
        'Іскри лише на фоні, вимикаються в меню',
        'Після Казана — знову печера, але важча',
      ],
    }),
  ];
}

function skins() {
  return BALANCE.meta.skins.map((s) =>
    entry({
      id: `skin:${s.id}`,
      category: 'skin',
      name: s.name,
      sprite: s.sprite,
      desc: s.price ? `Купується в магазині за ${s.price} Шагів.` : 'Стартовий скін.',
      facts: ['Лише вигляд: на гру не впливає'],
    }),
  );
}

/** Усі записи довідника в порядку категорій. */
export function buildCodex() {
  return [...character(), ...weapons(), ...skills(), ...loot(), ...enemies(), ...bosses(), ...biomes(), ...skins()];
}

const lower = (s) => s.toLocaleLowerCase('uk');
const BIOME_ORDER = { cave: 0, winter: 1, bamboo: 2, lava: 3 };
const sortValue = (e, key) => {
  const v = e[key];
  if (typeof v === 'string') return parseFloat(v); // «3–4» → 3
  return v;
};

/**
 * Пошук (за назвою, без регістру), фільтр за категорією ('all' — усі) і сортування.
 * Числові поля — за спаданням (найсильніші вгорі); записи без значення — у кінці. Не змінює вхід.
 */
export function queryCodex(entries, { query = '', category = 'all', sort = 'category' } = {}) {
  const q = lower(query.trim());
  const list = entries.filter((e) => (category === 'all' || e.category === category) && (!q || lower(e.name).includes(q)));
  const byName = (a, b) => a.name.localeCompare(b.name, 'uk');
  if (sort === 'category') return list; // filter вже дав новий масив у вихідному порядку
  return list.sort((a, b) => {
    if (sort === 'name') return byName(a, b);
    if (sort === 'biome') {
      const av = a.biome ? BIOME_ORDER[a.biome] : Infinity;
      const bv = b.biome ? BIOME_ORDER[b.biome] : Infinity;
      return av - bv || byName(a, b);
    }
    const av = sortValue(a, sort);
    const bv = sortValue(b, sort);
    if (av == null && bv == null) return byName(a, b);
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av || byName(a, b);
  });
}
