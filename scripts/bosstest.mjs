// Страховка босів (рефакторинг BossDirector): кожен бос проходить увесь шлях — підготовка (карта чиститься) → плашка →
// поява й представлення (пауза) → бій → миші ведмедя → смерть → прислужники й ворожі кулі зникають → наступний відрізок
// кола → вікно трофеїв (у ведмедя його немає) → гра йде далі. Окремо: ?intro=1 і «трофеї вже твої» (+Шаги).
// Бота сюди не досить: з 1-го рівня він Шкодька, Колю й Казана не вбиває. Боса тут б'ємо напряму (takeHit).
// Баланс, атаки босів і час бою цей скрипт НЕ перевіряє.
// Очікування щедрі (до 40 с): у хмарі без відеокарти туман бамбука гальмує гру в рази.
// Використання: node scripts/bosstest.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { port: 5600 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

/** Повний шлях боса. next — який бос і біом мають бути у відрізку після смерті; loot — чи є вікно трофеїв. */
async function bossPath({ boss, next, loot, bonus }) {
  const { scene, until, pickCards } = window.__t;
  const bad = [];
  const B = scene.bosses;
  if (!(await until(() => scene.stage === 'prep' || scene.stage === 'fight', 40000))) return ['етап «prep» не настав'];
  if (scene.hazards.getChildren().length) bad.push(`перед босом лишилось шипів: ${scene.hazards.getChildren().length}`);
  if (!(await until(() => B.bannerShown, 30000))) bad.push(`плашки боса немає (t=${scene.elapsedSec.toFixed(1)} stage=${scene.stage} paused=${scene.paused} levelUp=${scene.levelUpOpen} at=${scene.seg.atSec})`);
  if (!(await until(() => scene.introOpen, 30000))) return [...bad, 'представлення не відкрилось'];
  if (!scene.paused) bad.push('під час представлення гра не на паузі');
  if (!B.bossSpawned) bad.push('bossSpawned = false після появи');
  if (!(await until(() => window.game.scene.isActive('BossIntro') || !scene.introOpen, 3000)) || !scene.introOpen) bad.push('сцена BossIntro не активна');
  if (!(await until(() => !scene.introOpen && !scene.paused, 30000))) return [...bad, 'представлення не закрилось / гра не пішла'];
  if (scene.stage !== 'fight' || !scene.bossActive) bad.push(`після представлення етап ${scene.stage}`);
  if (scene.seg.boss !== boss) bad.push(`у відрізку бос ${scene.seg.boss}, чекали ${boss}`);

  // прислужники й ворожа куля: мають зникнути зі смертю боса
  const before = scene.enemies.getChildren().length;
  scene.spawnBearBats();
  const bats = scene.enemies.getChildren().filter((e) => e.bossMinion && e.constructor.name === 'Bat');
  if (scene.enemies.getChildren().length - before !== 2 || bats.length < 2) bad.push(`мишей ведмедя ${bats.length}, чекали 2`);
  const steps0 = scene.runSteps;
  const loop0 = scene.loop;

  // вбиваємо боса базовим Enemy.takeHit: в обхід стель шкоди за фазу (Шкодько, Коля) і невразливості
  const TYPES = ['boss', 'shkodko', 'kolya', 'bear', 'kazan'];
  const target = scene.enemies.getChildren().find((e) => e.active && TYPES.includes(e.type));
  if (!target) return [...bad, 'боса немає серед ворогів'];
  let proto = Object.getPrototypeOf(target);
  while (proto && !(proto.constructor.name === 'Enemy' && Object.hasOwn(proto, 'takeHit'))) proto = Object.getPrototypeOf(proto);
  if (!proto) return [...bad, 'не знайшов Enemy.takeHit'];
  target.invulnerable = false;
  proto.takeHit.call(target, 1e6, null, scene.nowMs);
  const killed = scene.killedAtSec !== null;
  if (!killed) return [...bad, 'боса не вдалося вбити'];

  if (B.bossSpawned || B.bannerShown) bad.push('прапорці боса не скинулись після смерті');
  if (scene.seg.boss !== next.boss || scene.seg.biome !== next.biome) bad.push(`наступний відрізок ${scene.seg.biome}/${scene.seg.boss}, чекали ${next.biome}/${next.boss}`);
  if (scene.loop !== loop0 + (next.loop ?? 0)) bad.push(`коло ${scene.loop}, чекали ${loop0 + (next.loop ?? 0)}`);
  if (scene.enemies.getChildren().some((e) => e.bossMinion || e.kolyaMinion || e.kazanMinion)) bad.push('прислужники боса лишились серед ворогів');
  if (scene.enemyProjectiles.getChildren().length) bad.push('ворожі кулі лишились');
  if (scene.bombs.getChildren().length) bad.push('бомби лишились');
  if (loot && !bonus) {
    if (!scene.lootCards?.length) bad.push('трофеїв не запропоновано');
    else if (!String(scene.lootTitle).startsWith('Трофей: ')) bad.push(`заголовок трофеїв: ${scene.lootTitle}`);
  } else if (scene.lootCards) bad.push('трофеї запропоновано, а не мали');
  if (bonus && scene.runSteps - steps0 < bonus) bad.push(`Шагів додалось ${scene.runSteps - steps0}, чекали щонайменше ${bonus}`);

  const picked = await pickCards(30000);
  if (loot && !bonus && !picked.some((id) => id.startsWith('loot:'))) bad.push(`трофей не вибрано (вибрано: ${picked.join(',') || 'нічого'})`);
  if (!(await until(() => !scene.paused && !scene.levelUpOpen && scene.stage !== 'fight' && scene.biome === next.biome, 30000))) {
    bad.push(`після боса гра не пішла далі: paused=${scene.paused} levelUp=${scene.levelUpOpen} stage=${scene.stage} biome=${scene.biome}`);
  }
  return bad;
}

const SCENARIOS = {
  'павучиха → зима з ведмедем': { query: '?boss=1', args: { boss: 'spider', next: { boss: 'bear', biome: 'winter' }, loot: true } },
  'ведмідь (без трофеїв) → Шкодько': { query: '?bear=1', args: { boss: 'bear', next: { boss: 'shkodko', biome: 'winter' }, loot: false } },
  'Шкодько → бамбук з Колею': { query: '?shkodko=1', args: { boss: 'shkodko', next: { boss: 'kolya', biome: 'bamboo' }, loot: true } },
  'Коля → лава з Казаном': { query: '?kolya=1', args: { boss: 'kolya', next: { boss: 'kazan', biome: 'lava' }, loot: true } },
  'Казан → печера наступного кола': { query: '?kazan=1', args: { boss: 'kazan', next: { boss: 'spider', biome: 'cave', loop: 1 }, loot: true } },
  'павучиха, усі трофеї вже взяті → +Шаги': {
    query: '?boss=1&cards=loot:armor,loot:venom,loot:oksana,loot:web,loot:form',
    args: { boss: 'spider', next: { boss: 'bear', biome: 'winter' }, loot: true, bonus: 1 },
  },
};

/** Готує сторінку: слизак безсмертний; помічники until і pickCards (тисне першу картку, поки вікна не скінчаться). */
function prepare() {
  const scene = window.game.scene.getScene('Game');
  scene.health = { ...scene.health, invulnerableUntil: Infinity };
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const until = async (fn, ms) => {
    for (const t0 = Date.now(); Date.now() - t0 < ms; await wait(50)) if (fn()) return true;
    return fn();
  };
  window.__t = {
    scene,
    until,
    pickCards: async (ms) => {
      const picked = [];
      const lu = window.game.scene.getScene('LevelUp');
      for (const t0 = Date.now(); Date.now() - t0 < ms; await wait(300)) {
        if (!scene.levelUpOpen && !scene.lootCards && scene.levelUpQueue === 0) break;
        if (!lu.sys.isActive()) continue;
        const cards = lu.sys.settings.data.cards;
        const rects = lu.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.width < window.game.scale.width);
        if (rects[0]) {
          picked.push(cards[0]);
          rects[0].emit('pointerdown');
        }
      }
      return picked;
    },
  };
}

async function start(page, query, ready) {
  await page.goto(`${base}${query}`);
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(ready)) return;
    await page.mouse.click(180, 320);
    await page.waitForTimeout(300);
  }
  throw new Error('гра не стартувала');
}

async function alive(page) {
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    await wait(1500);
    const f0 = window.game.loop.frame;
    await wait(600);
    return { frames: window.game.loop.frame - f0, crash: /Гра зламалась/.test(document.body.innerText) };
  });
}

const failures = [];
async function scenario(name, body) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  let bad = [];
  try {
    bad = await body(page);
    const after = await alive(page);
    if (after.frames <= 0) bad.push('кадри стали');
    if (after.crash) bad.push('екран «Гра зламалась»');
  } catch (e) {
    bad.push(e.message.split('\n')[0]);
  }
  if (errs.length) bad.push(`помилки: ${errs.slice(0, 3).join(' | ')}`);
  if (bad.length) failures.push(`${name}: ${bad.join('; ')}`);
  console.log(`${name} — ${bad.length ? 'ПРОВАЛ: ' + bad.join('; ') : 'ок'}`);
  await page.close();
}

for (const [name, sc] of Object.entries(SCENARIOS)) {
  await scenario(name, async (page) => {
    await start(page, sc.query, () => {
      const s = window.game?.scene.getScene('Game');
      return Boolean(s) && window.game.scene.isActive('Game') && s.elapsedSec > 1 && !s.paused;
    });
    await page.evaluate(prepare);
    return page.evaluate(bossPath, sc.args);
  });
}

// ?intro=1: представлення без боса — пауза, саме закривається, гра йде, боса немає
await scenario('?intro=1: представлення без боса', async (page) => {
  await start(page, '?intro=1', () => {
    const s = window.game?.scene.getScene('Game');
    return Boolean(s) && window.game.scene.isActive('Game') && (s.introOpen || s.elapsedSec > 0.2);
  });
  return page.evaluate(async () => {
    const scene = window.game.scene.getScene('Game');
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const bad = [];
    if (scene.introOpen && !scene.paused) bad.push('представлення відкрите, а гра не на паузі');
    for (let i = 0; i < 120 && (scene.introOpen || scene.paused); i++) await wait(50);
    if (scene.introOpen || scene.paused) bad.push('представлення не закрилось');
    if (scene.bosses.bossSpawned) bad.push('з\'явився бос, якого не мало бути');
    const t0 = scene.elapsedSec;
    await wait(500);
    if (!(scene.elapsedSec > t0)) bad.push('після представлення час гри стоїть');
    return bad;
  });
});

await browser.close();
await server.close();
if (failures.length) {
  console.log(`\nbosstest: ПРОВАЛ\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`\nbosstest: OK — ${Object.keys(SCENARIOS).length + 1} сценаріїв, помилок немає`);
