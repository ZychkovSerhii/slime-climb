// Страховка рефакторингу: бот УМИРАЄ. Сценарій у кожному біомі й на кожному босі:
// старт → трохи гри випадковими тапами → справжня смерть (через hurtPlayer) → GAME OVER → тап → нова гра жива.
// Наприкінці: пауза → «У меню» → нова гра, і GAME OVER → «Меню» → нова гра.
// Падає з кодом 1, якщо гра не перезапустилась, кадри стали або була помилка на сторінці.
// Використання: node scripts/deathtest.mjs [--only lava,kazan] [--quick]
import { createServer } from 'vite';
import { chromium } from 'playwright';

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const QUICK = process.argv.includes('--quick');
// після скількох секунд гри вмирати: 4 с — до боса, 14 с — посеред бою (дебаг-боси виходять на 6-й с)
const DIE_AT = QUICK ? [4] : [4, 14];
const SCENARIOS = ['cave', 'boss', 'winter', 'bear', 'shkodko', 'bamboo', 'kolya', 'lava', 'kazan'].filter((s) => !only || only.includes(s));
const VIEW = { width: 360, height: 640 };

const server = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const failures = [];
const state = (page) =>
  page.evaluate(() => {
    const g = window.game;
    const s = g.scene.getScene('Game');
    return {
      active: g.scene.getScenes(true).map((x) => x.scene.key),
      t: s.elapsedSec ?? -1,
      dead: s.dead,
      paused: s.paused,
      frame: g.loop.frame,
      lives: s.health?.lives,
      crash: Boolean(document.querySelector('[data-crash-guard]')) || /Гра зламалась/.test(document.body.innerText),
    };
  });

async function waitFor(page, pred, ms, what) {
  const t0 = Date.now();
  let st;
  while (Date.now() - t0 < ms) {
    st = await state(page);
    if (pred(st)) return st;
    await page.waitForTimeout(100);
  }
  throw new Error(`не дочекались: ${what}; стан ${JSON.stringify(st)}`);
}

/** Нова гра справді жива: сцена Game і HUD активні, час іде з нуля, кадри йдуть. */
async function expectFreshRun(page, label) {
  const a = await waitFor(page, (s) => s.active.includes('Game') && s.active.includes('Hud') && !s.active.includes('GameOver') && !s.dead && s.t >= 0 && s.t < 3, 4000, `${label}: нова гра`);
  await page.waitForTimeout(700);
  const b = await state(page);
  // представлення боса ставить гру на паузу — тоді час стоїть законно, але кадри мають іти
  if (b.frame <= a.frame) throw new Error(`${label}: кадри стали (${a.frame} → ${b.frame})`);
  if (!b.paused && b.t <= a.t) throw new Error(`${label}: час гри не йде (${a.t} → ${b.t})`);
  if (b.crash) throw new Error(`${label}: екран «Гра зламалась»`);
}

/** Грає випадковими тапами sec секунд гри, потім убиває слизака справжнім шляхом шкоди. */
async function playAndDie(page, sec, label) {
  const t0 = Date.now();
  // тапи ще й закривають представлення боса; ліміт за годинником — на випадок, коли гра стоїть
  while (Date.now() - t0 < (sec + 12) * 1000) {
    const st = await state(page);
    if (st.dead || st.active.includes('GameOver')) break; // умер сам — теж годиться
    if (st.t >= sec && !st.paused) break;
    await page.mouse.click(60 + Math.random() * 240, 200 + Math.random() * 300);
    await page.waitForTimeout(150 + Math.random() * 250);
  }
  // смерть: знімаємо невразливість і б'ємо тим самим hurtPlayer, що й шипи (щити «Я КОЛЯ/КАЗАН» з'їдають по удару)
  await page.evaluate(() => {
    const s = window.game.scene.getScene('Game');
    window.__kill = setInterval(() => {
      if (s.dead || !s.sys.isActive()) return clearInterval(window.__kill);
      if (s.paused) return;
      s.health = { ...s.health, invulnerableUntil: 0 };
      s.hurtPlayer();
    }, 50);
  });
  const t1 = Date.now();
  while (Date.now() - t1 < 15000) {
    const st = await state(page);
    if (st.active.includes('GameOver')) return;
    if (st.paused) await page.mouse.click(180, 320); // картки рівня / представлення боса — закрити тапом
    await page.waitForTimeout(200);
  }
  throw new Error(`${label}: GAME OVER не відкрився; стан ${JSON.stringify(await state(page))}`);
}

for (const sc of SCENARIOS) {
  const page = await browser.newPage({ viewport: VIEW });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::/.test(m.text()) && errors.push(`console: ${m.text()}`));
  const log = [];
  try {
    await page.goto(sc === 'cave' ? base : `${base}?${sc}=1`);
    await page.waitForTimeout(800);
    await page.mouse.click(180, 320); // меню → гра
    await expectFreshRun(page, `${sc}: перший старт`);
    for (const sec of DIE_AT) {
      await playAndDie(page, sec, `${sc}@${sec}s`);
      await page.waitForTimeout(900); // GAME OVER приймає тапи через 600 мс
      await page.mouse.click(180, 150); // «Тапни, щоб грати ще» (повз рядок таблиці й «Меню»)
      await expectFreshRun(page, `${sc}: після смерті на ${sec}-й с`);
      log.push(`смерть@${sec}с→ок`);
    }
    // пауза → «Продовжити» → гра йде далі (якщо не відкрите вікно карток чи представлення боса)
    await page.evaluate(() => window.game.scene.getScene('Game').pauseWithOverlay());
    await page.waitForTimeout(200);
    if (!(await state(page)).paused) throw new Error(`${sc}: пауза не ввімкнулась`);
    await page.mouse.click(180, 320);
    await page.waitForTimeout(300);
    const resumed = await page.evaluate(() => {
      const s = window.game.scene.getScene('Game');
      return { paused: s.paused, held: s.levelUpOpen || s.introOpen, overlay: s.pause.overlayOpen, dead: s.dead };
    });
    if (resumed.overlay || (resumed.paused && !resumed.held && !resumed.dead)) throw new Error(`${sc}: «Продовжити» не зняло паузу ${JSON.stringify(resumed)}`);
    log.push('продовжити→ок');
    // пауза → «У меню» (два тапи: перший перепитує) → нова гра
    await page.evaluate(() => window.game.scene.getScene('Game').pauseWithOverlay());
    await page.waitForTimeout(200);
    const btn = await page.evaluate(() => {
      const s = window.game.scene.getScene('Game');
      const b = s.pause.menuBtn;
      const c = window.game.canvas.getBoundingClientRect();
      return { x: c.left + (b.x / s.scale.width) * c.width, y: c.top + (b.y / s.scale.height) * c.height };
    });
    await page.mouse.click(btn.x, btn.y);
    await page.waitForTimeout(150);
    await page.mouse.click(btn.x, btn.y);
    await waitFor(page, (s) => s.active.includes('Menu') && !s.active.includes('Game') && !s.active.includes('Hud'), 3000, `${sc}: меню після паузи`);
    await page.waitForTimeout(400);
    await page.mouse.click(180, 320);
    await expectFreshRun(page, `${sc}: після «У меню»`);
    log.push('пауза→меню→ок');
    // GAME OVER → кнопка «Меню» → нова гра
    await playAndDie(page, 2, `${sc}: остання смерть`);
    await page.waitForTimeout(900);
    await page.mouse.click(180, 640 * 0.86);
    await waitFor(page, (s) => s.active.includes('Menu') && !s.active.includes('GameOver'), 3000, `${sc}: «Меню» з GAME OVER`);
    await page.waitForTimeout(400);
    await page.mouse.click(180, 320);
    await expectFreshRun(page, `${sc}: після «Меню» з GAME OVER`);
    log.push('gameover→меню→ок');
  } catch (e) {
    failures.push(`${sc}: ${e.message}`);
    await page.screenshot({ path: `deathtest-${sc}.png` }).catch(() => {});
  }
  if (errors.length) failures.push(`${sc}: помилки сторінки: ${[...new Set(errors)].join(' | ')}`);
  console.log(`${sc.padEnd(8)} ${log.join(', ') || '—'}${errors.length ? `  ПОМИЛОК: ${errors.length}` : ''}`);
  await page.close();
}

await browser.close();
await server.close();
if (failures.length) {
  console.error(`\ndeathtest: FAIL (${failures.length})`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`\ndeathtest: OK — ${SCENARIOS.length} сценаріїв, смерті на ${DIE_AT.join(' і ')} с, перезапуски живі, помилок немає`);
