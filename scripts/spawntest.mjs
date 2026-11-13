// Страховка спавну (рефакторинг SpawnDirector): смикає напряму ті гілки, якими бот ходить рідко або ніколи —
// рослина на місці шипа, сердечко, пара пінгвінів (коло 1+), Санта, подарунок, ніндзя й саламандра з черги,
// лавова крапля, «саламандра чекає», уламки іскри. Перевіряє: потрібна сутність з'явилась, кадри йдуть, помилок немає.
// Баланс і розклад (коли саме щось з'являється) цей скрипт НЕ перевіряє — для цього тести systems/* і бот.
// Використання: node scripts/spawntest.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { port: 5500 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

// Кожен сценарій виконується в сторінці; повертає список провалів (рядки). Помічники — у window.__t (див. prepare).
const SCENARIOS = {
  'cave: рослина й сердечко': {
    query: '',
    run: async () => {
      const { scene, sp, names, until } = window.__t;
      const bad = [];
      sp.pendingPlants = 1;
      if (!(await until(() => names.includes('Plant'), 8000))) bad.push('рослина не сіла на місце шипа');
      if (sp.pendingPlants !== 0) bad.push(`pendingPlants = ${sp.pendingPlants}`);
      scene.health = { ...scene.health, lives: scene.health.lives - 1 };
      sp.heartState = { nextAt: 0, lastFight: null };
      const heart = () => scene.pickups.getChildren().some((p) => p.active && p.kind === 'heart');
      if (!(await until(heart, 8000))) bad.push('сердечко не з\'явилось');
      return bad;
    },
  },
  'winter (коло 1): пінгвіни парою, Санта, подарунок': {
    query: '?winter=1&loop=1',
    run: async () => {
      const { scene, sp, names, until, count } = window.__t;
      const bad = [];
      sp.spawnPenguins();
      if (count('Penguin') !== 1) bad.push(`одразу пінгвінів ${count('Penguin')}, чекали 1`);
      if (!(await until(() => count('Penguin') === 2, 3000))) bad.push(`пари немає: пінгвінів ${count('Penguin')}`);
      const random = Math.random;
      Math.random = () => 0; // Санта — шанс; тут потрібна сама гілка
      sp.santaState = { nextCheckAt: 0 };
      sp.giftState = { nextAt: 0 };
      const gifts0 = scene.pickups.getChildren().length;
      try {
        sp.spawnWinterExtras();
      } finally {
        Math.random = random;
      }
      if (!names.includes('Santa')) bad.push('Санта не з\'явився');
      if (scene.pickups.getChildren().length !== gifts0 + 1) bad.push('подарунок не з\'явився');
      return bad;
    },
  },
  'bamboo: ніндзя з черги': {
    query: '?bamboo=1',
    run: async () => {
      const { scene, sp, names, noSpikes } = window.__t;
      const bad = [];
      for (const e of scene.enemies.getChildren().slice()) if (e.ninja) e.destroy();
      sp.walkerQueue = [];
      sp.requestNinja();
      if (sp.walkerQueue.length !== 1) bad.push(`у черзі ${sp.walkerQueue.length}, чекали 1`);
      sp.requestNinja();
      if (sp.walkerQueue.length !== 1) bad.push('другий ніндзя став у чергу');
      noSpikes();
      sp.stepWalkers();
      if (!names.includes('Ninja')) bad.push('ніндзя не з\'явився на вільній стіні');
      if (sp.walkerQueue.length) bad.push('черга не спорожніла');
      return bad;
    },
  },
  'lava (коло 1): саламандра, крапля, черга, уламки іскри': {
    query: '?lava=1&loop=1',
    run: async () => {
      const { scene, sp, names, noSpikes, count } = window.__t;
      const bad = [];
      const wipe = () => {
        for (const e of scene.enemies.getChildren().slice()) if (e.salamander) e.destroy();
        noSpikes();
        sp.walkerQueue = [];
        sp.salamanderWaiting = false;
      };
      wipe();
      sp.requestSalamander();
      sp.stepWalkers();
      if (!names.includes('Salamander')) bad.push('саламандра не з\'явилась');
      if (!sp.lavaWallBusy) bad.push('lavaWallBusy = false при живій саламандрі');
      wipe();
      sp.dropAt = 0;
      sp.spawnLavaDrop();
      if (sp.walkerQueue[0]?.type !== 'drop') bad.push('крапля не стала в чергу');
      sp.stepWalkers();
      const drop = scene.hazards.getChildren().find((h) => h.active && h.lavaDrop);
      if (!drop) bad.push('крапля не з\'явилась');
      sp.requestSalamander(); // стіна зайнята краплею — має чекати
      if (!sp.salamanderWaiting) bad.push('саламандра не чекає, поки летить крапля');
      drop?.destroy();
      sp.spawnLavaDrop(); // її черга
      if (sp.walkerQueue[0]?.type !== 'salamander' || sp.salamanderWaiting) bad.push('саламандра не дочекалась черги');
      sp.walkerQueue = [];
      sp.splitSpark(180, 200);
      if (count('Sparkling') < 1) bad.push('іскра не розпалась');
      return bad;
    },
  },
};

/** Готує сторінку: слизак безсмертний, рівні не ростуть (вікно карток ставить гру на паузу), імена створених ворогів. */
function prepare() {
  const scene = window.game.scene.getScene('Game');
  scene.health = { ...scene.health, invulnerableUntil: Infinity };
  scene.gainXp = () => {};
  const names = [];
  const spawnEnemy = scene.spawnEnemy.bind(scene);
  scene.spawnEnemy = (e) => {
    names.push(e.constructor.name);
    return spawnEnemy(e);
  };
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  window.__t = {
    scene,
    sp: scene.spawner,
    names,
    count: (n) => names.filter((x) => x === n).length,
    noSpikes: () => scene.hazards.clear(true, true),
    until: async (fn, ms) => {
      for (const t0 = Date.now(); Date.now() - t0 < ms; await wait(50)) if (fn()) return true;
      return fn();
    },
  };
}

const failures = [];
for (const [name, sc] of Object.entries(SCENARIOS)) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  let bad = [];
  try {
    await page.goto(`${base}${sc.query}`);
    let started = false;
    for (let i = 0; i < 60 && !started; i++) {
      started = await page.evaluate(() => {
        const s = window.game?.scene.getScene('Game');
        return Boolean(s) && window.game.scene.isActive('Game') && s.elapsedSec > 1 && !s.paused;
      });
      if (!started) {
        await page.mouse.click(180, 320);
        await page.waitForTimeout(300);
      }
    }
    if (!started) throw new Error('гра не стартувала');
    await page.evaluate(prepare);
    bad = await page.evaluate(sc.run);
    const after = await page.evaluate(async () => {
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      await wait(1500); // нові сутності встигають зробити кілька кроків
      const f0 = window.game.loop.frame;
      await wait(600);
      return { frames: window.game.loop.frame - f0, crash: /Гра зламалась/.test(document.body.innerText) };
    });
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
await browser.close();
await server.close();
if (failures.length) {
  console.log(`\nspawntest: ПРОВАЛ\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`\nspawntest: OK — ${Object.keys(SCENARIOS).length} сценарії, помилок немає`);
