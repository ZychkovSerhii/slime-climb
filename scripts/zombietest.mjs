// Страховка боса 5 «Мрець-Велетень» (біом 5): справжній бій у браузері, без бота.
// Перевіряє: тулуб над гравцем (не перекриває прохід), удар рукою по стіні гравця б'є, стрибок на іншу стіну рятує,
// 65% — 10 малих мерців (сильний удар не проскакує фазу), гнила плоть падає й дає тимчасове серце, 40% — курка бере
// шкоду й мрець невразливий, смерть курки — лють (музика, швидкість 240), смерть боса — наступне коло.
// Баланс і тривалість бою НЕ перевіряє. Використання: node scripts/zombietest.mjs (~1 хв)
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { port: 5700 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

async function fight() {
  const scene = window.game.scene.getScene('Game');
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const until = async (fn, ms) => {
    for (const t0 = Date.now(); Date.now() - t0 < ms; await wait(20)) if (fn()) return true;
    return fn();
  };
  const { BALANCE } = await import('/src/config/balance.js');
  const A = await import('/src/systems/Audio.js');
  const Z = BALANCE.zombie;
  const bad = [];
  const safe = () => (scene.health = { ...scene.health, lives: scene.maxLives, invulnerableUntil: Infinity });
  const open = () => (scene.health = { ...scene.health, lives: scene.maxLives, invulnerableUntil: 0 });
  safe();
  scene.gainXp = () => {}; // без вікон рівня посеред перевірки
  if (!(await until(() => scene.stage === 'fight' && !scene.introOpen && !scene.paused, 40000))) return ['бій не почався'];
  const boss = () => scene.enemies.getChildren().find((e) => e.active && e.type === 'zombie');
  if (!boss()) return ['боса немає'];
  if (!(await until(() => boss().act === 'fight', 20000))) return ['мрець не спустився'];
  await wait(600);
  const b = boss();
  const gap = scene.player.baseY - b.body.bottom;
  if (gap < Z.hoverAbovePx - 30) bad.push(`тулуб надто низько: ${gap.toFixed(0)} px над гравцем, чекали ~${Z.hoverAbovePx}`);
  if (b.body.width > Z.bodyW + 1) bad.push(`хітбокс ${b.body.width} px завширшки`);

  // 1) удар рукою по стіні гравця б'є
  await until(() => !b.strike, 5000);
  open();
  if (!(await until(() => b.strike && !b.strike.slammed, 8000))) bad.push('замаху немає');
  else {
    if (b.strike.zone.side !== scene.player.side) bad.push(`тінь на ${b.strike.zone.side}, гравець на ${scene.player.side}`);
    await until(() => !b.strike, 4000);
    if (scene.health.lives !== scene.maxLives - 1) bad.push(`удар не зачепив гравця: життів ${scene.health.lives}`);
  }
  // 2) стрибок на іншу стіну рятує
  safe();
  if (!(await until(() => b.strike && !b.strike.slammed, 8000))) bad.push('другого замаху немає');
  else {
    open();
    scene.player.press();
    await wait(30);
    scene.player.release();
    await until(() => !b.strike, 4000);
    if (scene.health.lives !== scene.maxLives) bad.push(`стрибок не врятував: життів ${scene.health.lives}`);
  }
  safe();

  // 3) 65%: сильний удар зупиняється на порозі, 10 малих мерців
  b.takeHit(1e6, null, scene.nowMs);
  if (Math.abs(b.hp / b.maxHp - Z.phases.summon) > 0.01) bad.push(`після удару 1e6 HP ${(b.hp / b.maxHp).toFixed(2)}, чекали ${Z.phases.summon}`);
  if (!b.events.summoned) bad.push('мерців не покликано');
  const minis = () => scene.enemies.getChildren().filter((e) => e.active && e.type === 'zombieMini');
  let total = 0;
  const seen = new Set();
  await until(() => {
    for (const m of minis()) seen.add(m);
    total = seen.size;
    return total >= Z.summon.count;
  }, 15000);
  if (total !== Z.summon.count) bad.push(`малих мерців ${total}, чекали ${Z.summon.count}`);
  // 4) гнила плоть: падає (шанс підкручено) і дає тимчасове серце
  const rnd = Math.random;
  Math.random = () => 0.01;
  for (const m of minis()) m.takeHit(1e6, null, scene.nowMs);
  Math.random = rnd;
  const flesh = scene.pickups.getChildren().filter((p) => p.active && p.kind === 'flesh');
  if (!flesh.length) bad.push('гнила плоть не впала');
  else {
    scene.health = { ...scene.health, lives: scene.maxLives };
    scene.collectGift(flesh[0]);
    if (!flesh[0].active) bad.push('плоть підібрано з повними життями');
    scene.health = { ...scene.health, lives: scene.maxLives - 1 };
    Math.random = () => 0.01;
    scene.collectGift(flesh[0]);
    Math.random = rnd;
    if (flesh[0].active) bad.push('плоть не підібрано з неповними життями');
    if (!(scene.health.tempUntil > scene.nowMs)) bad.push('тимчасового серця немає');
    await wait(300);
    if (!window.game.scene.getScene('Hud').rotHeart.visible) bad.push('тимчасове серце не видно в HUD');
  }
  safe();

  // 5) 40%: курка бере шкоду, мрець — ні
  b.takeHit(1e6, null, scene.nowMs);
  if (Math.abs(b.hp / b.maxHp - Z.phases.hen) > 0.01) bad.push(`після другого удару HP ${(b.hp / b.maxHp).toFixed(2)}, чекали ${Z.phases.hen}`);
  if (!b.events.mounted || !b.hen) bad.push('мрець не сів на курку');
  const hp0 = b.hp;
  const hen0 = b.henHp;
  b.takeHit(10, null, scene.nowMs);
  if (b.hp !== hp0) bad.push('на курці шкоду взяв мрець');
  if (b.henHp !== hen0 - 10) bad.push(`курка взяла ${hen0 - b.henHp} замість 10`);
  if (b.screenVelocity().vx === 0 && b.act === 'fight') bad.push('курка не гойдає мерця');
  // 6) курка гине — лють
  b.takeHit(1e6, null, scene.nowMs);
  if (!b.events.henDead) bad.push('курка не загинула');
  if (b.hp !== hp0) bad.push('смерть курки зачепила мерця');
  await wait(200);
  if (A.currentMusic() !== 'rageZombie') bad.push(`музика люті: ${A.currentMusic()}`);
  if (Math.abs(Math.abs(b.screenVelocity().vx) - Z.speed * Z.after.speedMul * b.loopSpeed) > 1) bad.push(`швидкість після курки ${b.screenVelocity().vx}`);
  // 7) смерть
  b.takeHit(1e6, null, scene.nowMs);
  if (b.active || scene.killedAtSec === null) bad.push('мрець не загинув');
  if (scene.seg.biome !== 'cave' || scene.loop !== 1) bad.push(`після мерця ${scene.seg.biome}, коло ${scene.loop}`);
  if (minis().length) bad.push('малі мерці лишились після смерті боса');
  return bad;
}

const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
let bad = [];
try {
  await page.goto(`${base}?zombie=1`);
  let started = false;
  for (let i = 0; i < 60 && !started; i++) {
    started = await page.evaluate(() => {
      const s = window.game?.scene.getScene('Game');
      return Boolean(s) && window.game.scene.isActive('Game') && s.elapsedSec > 0.3;
    });
    if (!started) {
      await page.mouse.click(180, 320);
      await page.waitForTimeout(300);
    }
  }
  if (!started) throw new Error('гра не стартувала');
  bad = await page.evaluate(fight);
  const after = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    await wait(1500);
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
await browser.close();
await server.close();
if (bad.length) {
  console.log(`zombietest: ПРОВАЛ\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('zombietest: OK — удар, ухилення, мерці, плоть, курка, лють, смерть');
