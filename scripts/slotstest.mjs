// Страховка етапу 14: два слоти зброї й заряджений стрибок — справжніми тапами по канвасу.
// 1) ?weapon=axe: сокира в слоті 2, кнопка зброї видна; тап по ній перемикає слот і НЕ стрибає.
// 2) дробовик вкачано до кінця → вікно «Куди поставити?» з трьома картками; тап по першій — дробовик замість стандартної.
// 3) утримання пальця: слизак сідає вище й сповзає; заряд на кулдауні, шкала видна; друге утримання — без підйому.
// Використання: node scripts/slotstest.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { BALANCE } from '../src/config/balance.js';

const server = await createServer({ server: { port: 5600 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
  console.log(`${ok ? 'ok ' : 'FAIL'} ${msg}`);
};

const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
try {
  await page.goto(`${base}?weapon=axe`);
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
  // ігрові px → px сторінки
  const toPage = (x, y) =>
    page.evaluate(([gx, gy]) => {
      const c = window.game.canvas.getBoundingClientRect();
      return { x: c.left + (gx * c.width) / window.game.scale.width, y: c.top + (gy * c.height) / window.game.scale.height };
    }, [x, y]);
  await page.evaluate(() => {
    const s = window.game.scene.getScene('Game');
    s.spawnEnemies = () => {};
    s.health = { ...s.health, invulnerableUntil: Number.MAX_SAFE_INTEGER };
  });

  // 1) кнопка зброї
  const st1 = await page.evaluate(async () => {
    const s = window.game.scene.getScene('Game');
    const { switchButton } = await import('/src/systems/Layout.js');
    return { slots: s.progression.arsenal.slots, main: s.progression.arsenal.main, hud: s.buttons.switchHud(), btn: switchButton(s.scale.width, s.scale.height) };
  });
  check(st1.main === 'axe' && st1.slots[1] === 'axe', `сокира в слоті 2 і в руках (${JSON.stringify(st1.slots)})`);
  check(Boolean(st1.hud), 'кнопка зброї видна');
  await page.waitForTimeout(600);
  const p1 = await toPage(st1.btn.x, st1.btn.y);
  await page.mouse.click(p1.x, p1.y);
  await page.waitForTimeout(200);
  const st2 = await page.evaluate(() => {
    const s = window.game.scene.getScene('Game');
    return { main: s.progression.arsenal.main, jumping: s.player.isJumping, view: s.combat.weaponView.main };
  });
  check(st2.main === null && st2.view === null, `тап по кнопці перемкнув на стандартну атаку (main=${st2.main})`);
  check(!st2.jumping, 'тап по кнопці — не стрибок');
  await page.mouse.click(p1.x, p1.y);
  await page.waitForTimeout(200);
  check((await page.evaluate(() => window.game.scene.getScene('Game').progression.arsenal.main)) === 'axe', 'другий тап — знову сокира');

  // 2) вікно вибору слота
  await page.evaluate((steps) => {
    const s = window.game.scene.getScene('Game');
    s.setPaused(true);
    s.levelUpOpen = true;
    s.levelUpQueue = 1;
    for (let i = 0; i < steps - 1; i++) s.applyPicked('weapon:shotgun');
    s.onCardPicked('weapon:shotgun');
  }, BALANCE.weapons.shotgun.steps);
  await page.waitForTimeout(900);
  const win = await page.evaluate(() => {
    const s = window.game.scene.getScene('Game');
    const lu = window.game.scene.getScene('LevelUp');
    const texts = lu.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
    return { active: window.game.scene.isActive('LevelUp'), pending: s.progression.arsenal.pending, texts };
  });
  check(win.active && win.pending === 'shotgun', 'вікно «Куди поставити?» відкрилось для дробовика');
  check(win.texts.some((t) => t.includes('Замість: Стандартна атака')) && win.texts.some((t) => t.includes('Не брати')), `картки слотів (${win.texts.filter((t) => t.length < 40).join(' | ')})`);
  const H = await page.evaluate(() => window.game.scale.height);
  // перша картка: CARD h 200, gap 30, три картки по центру
  const p2 = await toPage(360, H / 2 - 230);
  await page.mouse.click(p2.x, p2.y);
  await page.waitForTimeout(900);
  const st3 = await page.evaluate(() => {
    const s = window.game.scene.getScene('Game');
    return { slots: s.progression.arsenal.slots, main: s.progression.arsenal.main, paused: s.paused, lu: window.game.scene.isActive('LevelUp') };
  });
  check(JSON.stringify(st3.slots) === '["shotgun","axe"]' && st3.main === 'shotgun', `дробовик замість стандартної (${JSON.stringify(st3.slots)})`);
  check(!st3.paused && !st3.lu, 'гра йде далі');

  // 3) заряджений стрибок
  await page.waitForTimeout(BALANCE.tapGuardMs + 200);
  const mid = await toPage(360, 500);
  const holdJump = async () => {
    await page.mouse.move(mid.x, mid.y);
    await page.mouse.down();
    await page.waitForTimeout(BALANCE.holdMaxMs + 120);
    await page.mouse.up();
    // чекаємо приземлення
    for (let i = 0; i < 40; i++) {
      if (!(await page.evaluate(() => window.game.scene.getScene('Game').player.isJumping))) break;
      await page.waitForTimeout(50);
    }
    return page.evaluate(() => {
      const p = window.game.scene.getScene('Game').player;
      return { lift: p.lift, dy: p.baseY - p.y, ready: p.chargeReady };
    });
  };
  const j1 = await holdJump();
  check(j1.lift > BALANCE.charge.liftPx * 0.5 && j1.dy > BALANCE.charge.liftPx * 0.5, `заряджений стрибок сів вище (на ${Math.round(j1.dy)} px)`);
  check(!j1.ready, 'заряд на кулдауні');
  await page.waitForTimeout(BALANCE.charge.slideMs + 300);
  const slid = await page.evaluate(() => window.game.scene.getScene('Game').player.lift);
  check(slid === 0, `сповз на місце (lift ${slid})`);
  const j2 = await holdJump();
  check(j2.lift === 0, `на кулдауні утримання не піднімає (lift ${j2.lift})`);
} catch (e) {
  failures.push(String(e));
  console.log('FAIL', e);
}
check(errs.length === 0, `без помилок у консолі ${errs.slice(0, 3).join(' | ')}`);
await browser.close();
await server.close();
console.log(failures.length ? `\nПРОВАЛ: ${failures.length}` : '\nУсе гаразд');
process.exit(failures.length ? 1 : 0);
