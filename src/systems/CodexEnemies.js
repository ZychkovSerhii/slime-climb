// Тексти поведінки ворогів для довідника (винесено з Codex.js — стеля 650 рядків, tests/size.test.js). Числа — з BALANCE.
import { BALANCE } from '../config/balance.js';

const E = BALANCE.enemies;
const W = BALANCE.winter;
const sec = (ms) => String(Math.round(ms / 10) / 100).replace('.', ',');
const pct = (x) => Math.round(x * 100);

// id ворога → { name, biome, hp?, speed?, desc, facts }
export const ENEMIES = {
  lion: () => ({
    name: 'Левиця',
    biome: 'cave',
    speed: E.lion.speed,
    desc: `Біжить по стіні знизу вгору. За ${E.lion.lungeBelowPx} px під тобою завмирає, блимає і стрибає туди, де ти був.`,
    facts: [`Промахнулась — ще ${E.lion.returns} раз повертається знизу на іншій стіні`, `Ривок: ${E.lion.lungeSpeed} px/с`],
  }),
  bat: () => ({
    name: 'Кажан',
    biome: 'cave',
    speed: E.bat.speed,
    desc: 'Летить прямо на тебе згори. Б\'є лише дотиком.',
    facts: [`У бамбуку й лаві — свої миші (див. «${BALANCE.bamboo.bat.name}», «${BALANCE.lava.bat.name}»)`],
  }),
  plant: () => ({
    name: 'Квітка',
    biome: 'cave',
    desc: `Сидить на стіні й стріляє в тебе, коли вона вище за тебе. Перед пострілом ${sec(E.plant.windupMs)} с блимає жовтим.`,
    facts: [`Постріл раз на ${sec(E.plant.fireMs)} с`, 'Від кулі рятує стрибок'],
  }),
  smallSpider: () => ({
    name: 'Павучок',
    biome: 'cave',
    speed: E.smallSpider.speed,
    desc: `Повзе на тебе. З'являється в рої «${BALANCE.boss.name}».`,
    facts: [`Дотик павучка з рою отруює: ${sec(BALANCE.boss.poison.durationMs)} с ти на ${pct(1 - BALANCE.boss.poison.speedMul)}% повільніший`],
  }),
  elf: () => ({
    name: 'Ельф',
    biome: 'winter',
    speed: E.elf.speed,
    desc: `Летить на крильцях до тебе і кидає льодяник туди, де ти був. Перед кидком ${sec(E.elf.windupMs)} с замахується.`,
    facts: [`Кидок раз на ${sec(E.elf.throwMs)} с`, `Вилетів за край — ще ${E.elf.wraps} раз з'являється з іншого боку`],
  }),
  penguin: () => ({
    name: 'Пінгвін',
    biome: 'winter',
    hp: `${E.penguin.hp}–${E.penguin.hpMax}`,
    speed: E.penguin.slideSpeed,
    desc: `З'являється вгорі біля стіни, де тебе немає, блимає ${sec(E.penguin.warnMs)} с і ковзає на пузі прямо туди, де ти був.`,
    facts: [`Вилетів за край — ще ${E.penguin.wraps} раз атакує з іншого боку`, 'Ухиляйся стрибком на іншу стіну'],
  }),
  snowball: () => ({
    name: 'Снігова куля',
    biome: 'winter',
    speed: E.snowball.speed,
    desc: `Котиться згори по стіні, де тебе немає, і росте вдвічі з гаком за ${sec(E.snowball.growMs)} с. Б'є дотиком.`,
    facts: ['Не стрибай на її стіну, поки вона поруч', 'Міцна, але її можна розбити пострілами'],
  }),
  santa: () => ({
    name: 'Санта',
    biome: 'winter',
    speed: E.santa.speed,
    desc: 'Пролітає поперек екрана й тебе не б\'є. Зіб\'єш — отримаєш рівень і Шаги.',
    facts: [`Шанс появи: ${pct(E.santa.chancePerMin)}% щохвилини`],
  }),
  // ---- Туманний бамбук і Коля (етап 9)
  ninja: () => ({
    name: 'Ніндзя',
    biome: 'bamboo',
    desc: `З'являється в клубі диму вгорі на стіні, де тебе немає, кидає сюрикен, у диму перескакує на протилежну стіну і за ${sec(E.ninja.stayMs)} с зникає. Збив до кидка — кидка немає.`,
    facts: [`Сюрикен: ${E.ninja.shurikenSpeed} px/с, від нього рятує стрибок`, 'Поки летить сюрикен, на стіні ніндзі біля тебе немає кілків', 'Дим не б\'є'],
  }),
  lantern: () => ({
    name: 'Ліхтарик-дух',
    biome: 'bamboo',
    speed: E.lantern.speed,
    desc: `Паперовий ліхтар з вогником. Летить на тебе впритул: за ${E.lantern.armPx} px зупиняється, стає невразливим, блимає ${sec(E.lantern.blinkMs)} с і вибухає.`,
    facts: [`Вибух: квадрат ${E.lantern.radiusPx * 2}×${E.lantern.radiusPx * 2} px — стрибни на іншу стіну`, 'Збив до зупинки — вибуху немає'],
  }),
  slugBiter: () => ({
    name: 'Слимак-кусака',
    biome: 'bamboo',
    speed: E.slugBiter.speed,
    desc: `Малий слимак «${BALANCE.kolya.name}». Повзе по повітрю прямо на тебе.`,
  }),
  slugSpitter: () => ({
    name: 'Личинка-стрілець',
    biome: 'bamboo',
    speed: E.slugSpitter.speed,
    desc: `Малий слимак «${BALANCE.kolya.name}». Тримається над тобою на ${E.slugSpitter.keepPx} px і плює слизом.`,
    facts: [`Плювок раз на ${sec(E.slugSpitter.spitMs)} с, перед ним блимає жовтим`],
  }),
  // ---- Лавові надра і Пан Казан (етап 11)
  salamander: () => ({
    name: 'Саламандра',
    biome: 'lava',
    desc: `Вилазить із тріщини на стіні, де тебе немає. Показує лінію на твоїй висоті і за ${sec(E.salamander.warnMs)} с дихає вогнем через увесь коридор.`,
    facts: ['Від струменя рятує стрибок: траєкторія йде вгору', 'Збив до видиху — видиху немає', 'Поки вона дихає, на її стіні біля тебе немає кілків'],
  }),
  spark: () => ({
    name: 'Іскра',
    biome: 'lava',
    speed: E.spark.speed,
    desc: `Летить до тебе зигзагом. Збив — розпадається на ${E.spark.splits} дрібні іскри, що летять по прямій.`,
  }),
  sparkling: () => ({
    name: 'Дрібна іскра',
    biome: 'lava',
    speed: E.sparkling.speed,
    desc: `Уламок іскри. Не гасне й летить на тебе; зблизька перестає доворачувати — відстрибни.`,
  }),
  bubble: () => ({
    name: 'Бульбашка',
    biome: 'lava',
    speed: E.bubble.speed,
    desc: `Її випускає «${BALANCE.kazan.name}», коли закипає. Пливе до тебе і лопається від дотику або за ${sec(E.bubble.lifeMs)} с.`,
    facts: [`Вибух: радіус ${E.bubble.popPx} px`],
  }),
  wagon: () => ({
    name: 'Вагон потяга',
    biome: 'winter',
    speed: BALANCE.shkodko.train.speed,
    desc: `Частина потяга-змійки «${BALANCE.shkodko.name}». Їде слідом за паровозом; паровоз невразливий.`,
  }),
};
