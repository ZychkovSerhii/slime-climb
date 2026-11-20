// Страховка кнопок трансформацій (фідбек-8): «Полукровка» + павук + Шкодько + Коля з першої секунди.
// Справжні тапи по кнопках HUD зліва внизу: рій (12 павучків кусають і зникають), паровоз (слизак схований і невразливий,
// дрібних ваншотить, через 10 с повертається), клони (двоє, прозоріші, стріляють разом із слизаком). Тап по кнопці — не стрибок.
// Використання: node scripts/formtest.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { BALANCE } from '../src/config/balance.js';

const server = await createServer({ server: { port: 5700 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const bad = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'ok ' : 'ПРОВАЛ'} ${msg}`);
  if (!ok) bad.push(msg);
};

await page.goto(`${base}?cards=loot:form,loot:iam,loot:iamkolya,halfblood`);
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

// ігрові координати кнопки → CSS-точка для справжнього тапу
const tapForm = async (i) => {
  const p = await page.evaluate(async (i) => {
    const { formButton } = await import('/src/systems/Layout.js');
    const g = window.game;
    const b = formButton(i, g.scale.width, g.scale.height);
    const r = g.canvas.getBoundingClientRect();
    return { x: r.left + (b.x * r.width) / g.scale.width, y: r.top + (b.y * r.height) / g.scale.height };
  }, i);
  await page.mouse.click(p.x, p.y);
};

const setup = await page.evaluate(async () => {
  const s = window.game.scene.getScene('Game');
  s.spawnEnemies = () => {};
  s.gainXp = () => {}; // без вікна рівня посеред перевірки
  window.__jumps = 0;
  s.player.on('jumped', () => window.__jumps++);
  return { hud: s.forms.hud()?.map((f) => f.id), halfblood: s.progression.picks.halfblood };
});
check(JSON.stringify(setup.hud) === JSON.stringify(['swarm', 'train', 'clones']), `три кнопки з «Полукровкою»: ${setup.hud}`);
await page.screenshot({ path: '/tmp/formtest-buttons.png' });

// ворогів підкидаємо кажанами над слизаком
const spawnBats = (n, hp) => page.evaluate(async ({ n, hp }) => {
  const s = window.game.scene.getScene('Game');
  const { default: Bat } = await import('/src/entities/Bat.js');
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = new Bat(s, { x: 150 + (i % 4) * 120, y: 250 + Math.floor(i / 4) * 90 });
    s.spawnEnemy(b);
    b.hp = hp;
    if (b.body) b.body.setVelocity(0, 0);
    out.push(b);
  }
  window.__bats = out;
}, { n, hp });
const freezeBats = () => page.evaluate(() => {
  for (const b of window.__bats ?? []) if (b.active && b.body) b.body.setVelocity(0, 0);
});

// 1) рій
await spawnBats(4, 100);
await tapForm(0);
for (let i = 0; i < 25; i++) {
  await freezeBats();
  await page.waitForTimeout(100);
}
const swarm = await page.evaluate(() => {
  const s = window.game.scene.getScene('Game');
  const lost = window.__bats.reduce((a, b) => a + (100 - b.hp), 0);
  return { spiders: s.forms.spiders.length, lost, cd: s.forms.hud()[0].charge, jumps: window.__jumps };
});
check(swarm.lost > 0, `рій кусає кажанів: знято ${swarm.lost} HP`);
check(swarm.cd < 1, 'рій на перезарядці після тапу');
check(swarm.jumps === 0, `тап по кнопці не стрибок (стрибків ${swarm.jumps})`);

// 2) клони
await page.evaluate(() => {
  for (const b of window.__bats) b.destroy();
});
await spawnBats(2, 1e6);
await tapForm(2);
await page.waitForTimeout(300);
const clones = await page.evaluate(async () => {
  const s = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = s.forms.shooters();
  let fromClone = 0;
  const near = (p) => c.some((k) => Math.abs(k.x - p.x) < 5 && Math.abs(k.y - p.y) < 5);
  const add = s.playerProjectiles.add.bind(s.playerProjectiles);
  s.playerProjectiles.add = (p, ...x) => {
    if (near(p)) fromClone++;
    return add(p, ...x);
  };
  for (let i = 0; i < 25; i++) {
    for (const b of window.__bats) if (b.body) b.body.setVelocity(0, 0);
    await wait(100);
  }
  return { n: c.length, alpha: c.map((k) => k.alpha), dy: c.map((k) => Math.round(k.y - s.player.y)), fromClone };
});
check(clones.n === 2, `два клони (${clones.n})`);
check(clones.alpha.every((a) => Math.abs(a - BALANCE.forms.clones.alpha) < 0.05), `клони прозоріші: ${clones.alpha}`);
check(clones.dy[0] < 0 && clones.dy[1] > 0, `один над, другий під слизаком: ${clones.dy}`);
check(clones.fromClone > 0, `клони стріляють (${clones.fromClone} куль)`);
await page.screenshot({ path: '/tmp/formtest-clones.png' });

// 3) паровоз
await page.evaluate(() => {
  for (const b of window.__bats) b.destroy();
});
await spawnBats(6, 3);
await tapForm(1);
await page.waitForTimeout(1500);
const ride1 = await page.evaluate(() => {
  const s = window.game.scene.getScene('Game');
  const lives = s.health.lives;
  s.health = { ...s.health }; // удар під час поїздки нічого не знімає
  s.hurtPlayer();
  return { riding: s.forms.riding(), alpha: s.player.alpha, lost: lives - s.health.lives };
});
await page.screenshot({ path: '/tmp/formtest-train.png' });
check(ride1.riding && ride1.alpha === 0, `слизак сів у паровоз (схований): ${JSON.stringify(ride1)}`);
check(ride1.lost === 0, 'у паровозі невразливий');
const before = await page.evaluate(() => window.__jumps);
await page.mouse.click(180, 500);
await page.waitForTimeout(300);
check((await page.evaluate(() => window.__jumps)) === before, 'у паровозі тап не стрибає');
await page.waitForTimeout(BALANCE.forms.train.ms - 1500);
// у хмарі гра йде повільніше за годинник — чекаємо кінця поїздки за часом гри, до 40 с
for (let i = 0; i < 160 && (await page.evaluate(() => window.game.scene.getScene('Game').forms.riding())); i++) await page.waitForTimeout(250);
const ride2 = await page.evaluate(() => {
  const s = window.game.scene.getScene('Game');
  return { riding: s.forms.riding(), alpha: s.player.alpha, killed: window.__bats.filter((b) => !b.active).length, now: s.nowMs, until: s.forms.ride?.until, paused: s.paused, dead: s.dead, scenes: window.game.scene.getScenes(true).map((x) => x.sys.settings.key) };
});
check(!ride2.riding && ride2.alpha > 0, `поїздка скінчилась, слизак знову видно: ${JSON.stringify(ride2)}`);
check(ride2.killed > 0, `паровоз збив кажанів: ${ride2.killed} з 6`);

const crash = await page.evaluate(() => /Гра зламалась/.test(document.body.innerText));
check(!crash, 'без екрана «Гра зламалась»');
check(errs.length === 0, `без помилок у консолі ${errs.slice(0, 2).join(' | ')}`);
await browser.close();
await server.close();
if (bad.length) {
  console.log(`\nformtest: ПРОВАЛ\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('\nformtest: OK — рій, клони, паровоз, «Полукровка», тапи по кнопках');
