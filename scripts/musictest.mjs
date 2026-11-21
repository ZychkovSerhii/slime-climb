// Страховка звуку v2 (~40 с): музика меню й перемикачі «Музика» / «Ефекти» (вибір зберігається, вимкнена музика
// не планується, увімкнена — грає те, що мало б), музика кожного біому на старті, пауза з оверлеєм приспає звук,
// а дотик повз «Продовжити» його не будить, вихід у меню — знову музика меню; вимкнений екран (visibilitychange)
// приспає звук і в меню, і в грі.
// Боси (представлення, тема, лють, фанфара → біом) — у bosstest. Як воно звучить, скрипт НЕ перевіряє — лише що грає.
// Використання: node scripts/musictest.mjs
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

const failures = [];
async function scenario(name, body) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  let bad = [];
  try {
    bad = await body(page);
  } catch (e) {
    bad.push(e.message.split('\n')[0]);
  }
  if (errs.length) bad.push(`помилки: ${errs.slice(0, 3).join(' | ')}`);
  if (bad.length) failures.push(`${name}: ${bad.join('; ')}`);
  console.log(`${name} — ${bad.length ? 'ПРОВАЛ: ' + bad.join('; ') : 'ок'}`);
  await page.close();
}

async function waitFor(page, fn, ms = 20000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms; await page.waitForTimeout(200)) if (await page.evaluate(fn)) return true;
  return page.evaluate(fn);
}

await scenario('меню: музика й перемикачі', async (page) => {
  await page.goto(base);
  if (!(await waitFor(page, () => window.game?.scene.isActive('Menu')))) return ['меню не відкрилось'];
  await page.mouse.click(10, 630); // дотик повз кнопки будить звук… і стартує гру — тому далі повертаємось у меню
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const A = await import('/src/systems/Audio.js');
    const bad = [];
    const game = window.game;
    if (game.scene.isActive('Game')) {
      game.scene.getScene('Game').pause.quitToMenu();
      await wait(800);
    }
    if (A.currentMusic() !== 'menu' || !A.musicPlaying()) bad.push(`у меню музика ${A.currentMusic()} (грає: ${A.musicPlaying()})`);
    if (A.audioState() !== 'running') bad.push(`AudioContext ${A.audioState()} після дотику`);
    const menu = game.scene.getScene('Menu');
    const btn = (prefix) => menu.children.list.find((o) => o.type === 'Text' && o.text.startsWith(prefix));
    for (const p of ['Музика: увімк.', 'Ефекти: увімк.', 'Складність']) if (!btn(p)) bad.push(`немає кнопки «${p}»`);
    if (btn('Звук')) bad.push('лишилась стара кнопка «Звук»');
    btn('Музика').emit('pointerdown');
    if (btn('Музика').text !== 'Музика: вимк.') bad.push(`після тапу кнопка «${btn('Музика').text}»`);
    if (A.musicPlaying()) bad.push('музику вимкнули, а вона планується');
    if (A.currentMusic() !== 'menu') bad.push('вимкнена музика забула, що грає меню');
    if (localStorage.getItem('slime-climb:musicMuted') !== '1') bad.push('вибір «Музика: вимк.» не збережено');
    if (A.isSfxMuted()) bad.push('вимкнення музики вимкнуло й ефекти');
    btn('Музика').emit('pointerdown');
    if (!A.musicPlaying() || A.currentMusic() !== 'menu') bad.push('після увімкнення музика меню не заграла');
    btn('Ефекти').emit('pointerdown');
    if (!A.isSfxMuted() || localStorage.getItem('slime-climb:sfxMuted') !== '1') bad.push('«Ефекти: вимк.» не спрацювало / не збережено');
    if (!A.musicPlaying()) bad.push('вимкнення ефектів зупинило музику');
    btn('Ефекти').emit('pointerdown');
    // кнопки не налазять одна на одну і не виходять за екран
    const rects = menu.children.list.filter((o) => o.type === 'Text' && o.input).map((o) => ({ t: o.text, r: o.getBounds() }));
    for (const { t, r } of rects) if (r.left < 0 || r.right > game.scale.width) bad.push(`«${t}» за краєм екрана`);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r;
        const b = rects[j].r;
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(`«${rects[i].t}» налазить на «${rects[j].t}»`);
      }
    return bad;
  });
});

await scenario('старе «Звук: вимк.» → тиша і там, і там', async (page) => {
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slime-climb:muted', '1');
  });
  await page.goto(base);
  if (!(await waitFor(page, () => window.game?.scene.isActive('Menu')))) return ['меню не відкрилось'];
  return page.evaluate(async () => {
    const A = await import('/src/systems/Audio.js');
    const menu = window.game.scene.getScene('Menu');
    const texts = menu.children.list.filter((o) => o.type === 'Text').map((o) => o.text);
    const bad = [];
    if (!texts.includes('Музика: вимк.') || !texts.includes('Ефекти: вимк.')) bad.push(`кнопки: ${texts.filter((t) => /Музика|Ефекти/.test(t)).join(', ')}`);
    if (A.musicPlaying()) bad.push('музика грає, хоча звук вимикали');
    localStorage.clear();
    return bad;
  });
});

const BIOMES = { '': 'cave', '?winter=1': 'winter', '?bamboo=1': 'bamboo', '?lava=1': 'lava', '?grass=1': 'grass' };
for (const [query, track] of Object.entries(BIOMES)) {
  await scenario(`старт ${query || 'звичайний'} → ${track}`, async (page) => {
    await page.goto(`${base}${query}`);
    for (let i = 0; i < 40 && !(await page.evaluate(() => window.game?.scene.isActive('Game'))); i++) {
      await page.mouse.click(180, 320);
      await page.waitForTimeout(300);
    }
    if (!(await waitFor(page, () => window.game.scene.getScene('Game').elapsedSec > 1.5))) return ['гра не пішла'];
    return page.evaluate(async (want) => {
      const A = await import('/src/systems/Audio.js');
      return A.currentMusic() === want && A.musicPlaying() ? [] : [`музика ${A.currentMusic()} (грає: ${A.musicPlaying()}), чекали ${want}`];
    }, track);
  });
}

await scenario('пауза приспає звук, дотик повз «Продовжити» не будить, «Продовжити» — будить', async (page) => {
  await page.goto(base);
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.game?.scene.isActive('Game'))); i++) {
    await page.mouse.click(180, 320);
    await page.waitForTimeout(300);
  }
  if (!(await waitFor(page, () => window.game.scene.getScene('Game').elapsedSec > 1))) return ['гра не пішла'];
  await page.evaluate(() => window.game.scene.getScene('Game').pauseWithOverlay());
  await page.waitForTimeout(300);
  const st = () => import('/src/systems/Audio.js').then((A) => A.audioState());
  const bad = [];
  if ((await page.evaluate(st)) !== 'suspended') bad.push('на паузі звук не приспано');
  await page.mouse.click(5, 5); // повз оверлей
  await page.waitForTimeout(300);
  if ((await page.evaluate(st)) !== 'suspended') bad.push('дотик повз «Продовжити» розбудив звук на паузі');
  await page.evaluate(() => window.game.scene.getScene('Game').pause.overlay.emit('pointerdown', null, 0, 0, null));
  await page.waitForTimeout(300);
  if ((await page.evaluate(st)) !== 'running') bad.push('після «Продовжити» звук не повернувся');
  return bad;
});

// Баг 2026-11-20: музика грала при вимкненому екрані — приспати звук уміла лише сцена гри, а в меню ніхто
const hide = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

await scenario('екран вимкнено: у меню звук спить, повернення будить', async (page) => {
  await page.goto(base);
  if (!(await waitFor(page, () => window.game?.scene.isActive('Menu')))) return ['меню не відкрилось'];
  await page.mouse.click(10, 630); // будить звук (і стартує гру — повертаємось у меню, як у першому сценарії)
  await page.waitForTimeout(300);
  return page.evaluate(async (hideSrc) => {
    const hide = eval(hideSrc);
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const A = await import('/src/systems/Audio.js');
    const bad = [];
    const game = window.game;
    if (game.scene.isActive('Game')) {
      game.scene.getScene('Game').pause.quitToMenu();
      await wait(800);
    }
    if (A.audioState() !== 'running') return [`до перевірки звук ${A.audioState()}`];
    hide(true);
    await wait(200);
    if (A.audioState() !== 'suspended') bad.push(`у меню екран вимкнено, а звук ${A.audioState()}`);
    document.dispatchEvent(new Event('pointerdown'));
    await wait(100);
    if (A.audioState() !== 'suspended') bad.push('у фоні дотик розбудив звук');
    hide(false);
    await wait(200);
    if (A.audioState() !== 'running') bad.push(`після повернення в меню звук ${A.audioState()}`);
    if (A.currentMusic() !== 'menu' || !A.musicPlaying()) bad.push(`після повернення музика ${A.currentMusic()} (грає: ${A.musicPlaying()})`);
    return bad;
  }, hide.toString());
});

await scenario('екран вимкнено в грі: після повернення звук спить до «Продовжити»', async (page) => {
  await page.goto(base);
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.game?.scene.isActive('Game'))); i++) {
    await page.mouse.click(180, 320);
    await page.waitForTimeout(300);
  }
  if (!(await waitFor(page, () => window.game.scene.getScene('Game').elapsedSec > 1))) return ['гра не пішла'];
  const st = () => import('/src/systems/Audio.js').then((A) => A.audioState());
  const bad = [];
  await page.evaluate((src) => eval(src)(true), hide.toString());
  await page.waitForTimeout(300);
  if ((await page.evaluate(st)) !== 'suspended') bad.push('екран вимкнено, а звук грає');
  await page.evaluate((src) => eval(src)(false), hide.toString());
  await page.waitForTimeout(300);
  if (!(await page.evaluate(() => window.game.scene.getScene('Game').pause.overlayOpen))) bad.push('немає оверлею «Продовжити»');
  if ((await page.evaluate(st)) !== 'suspended') bad.push('повернення розбудило звук до «Продовжити»');
  await page.evaluate(() => window.game.scene.getScene('Game').pause.overlay.emit('pointerdown', null, 0, 0, null));
  await page.waitForTimeout(300);
  if ((await page.evaluate(st)) !== 'running') bad.push('після «Продовжити» звук не повернувся');
  return bad;
});

await browser.close();
await server.close();
if (failures.length) {
  console.log(`\nmusictest: ПРОВАЛ\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nmusictest: OK — помилок немає');
