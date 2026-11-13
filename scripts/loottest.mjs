// Страховка трофеїв (рефакторинг LootEffects): усі трофеї з першої секунди, удар по слизаку —
// «Я КОЛЯ» має поділитися на копії, «Я КАЗАН» — дати щит; життя не знімається, кадри йдуть, помилок немає.
// deathtest цього не ловить (вмирає без трофеїв), бот playtest — лише якщо випадково отримає удар.
// Використання: node scripts/loottest.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { BALANCE } from '../src/config/balance.js';

const CARDS = 'loot:armor,loot:venom,loot:oksana,loot:web,loot:sack,loot:larva,loot:ladle';
const server = await createServer({ server: { port: 5400 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const failures = [];
for (const form of ['iam', 'iamkolya', 'iamkazan']) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  try {
    await page.goto(`${base}?cards=${CARDS},loot:${form}`);
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
    await page.waitForTimeout(4000); // мішок, личинка, черпачок, Оксанка встигають зробити кілька кроків
    const r = await page.evaluate(async () => {
      const s = window.game.scene.getScene('Game');
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      // кожух з'їдає перший удар — знімаємо його, щоб удар дійшов до форми
      s.armor = null;
      s.health = { ...s.health, invulnerableUntil: 0 };
      const lives0 = s.health.lives;
      s.hurtPlayer();
      const a = {
        lost: lives0 - s.health.lives,
        copies: s.loot.kolyaCopies.length,
        shield: s.health.invulnerableUntil > s.nowMs,
        helpers: ['oksana', 'sack', 'larva', 'ladle'].filter((k) => !s.loot[k]),
      };
      await wait(1500);
      const f0 = window.game.loop.frame;
      await wait(600);
      a.frames = window.game.loop.frame - f0;
      a.crash = /Гра зламалась/.test(document.body.innerText);
      return a;
    });
    const want = form === 'iam' ? { lost: 1, copies: 0 } : form === 'iamkolya' ? { lost: 0, copies: BALANCE.kolyaLoot.iam.copies } : { lost: 0, copies: 0 };
    const bad = [];
    if (r.lost !== want.lost) bad.push(`життів знято ${r.lost}, чекали ${want.lost}`);
    if (r.copies !== want.copies) bad.push(`копій ${r.copies}, чекали ${want.copies}`);
    if (!r.shield) bad.push('немає невразливості після удару');
    if (r.helpers.length) bad.push(`немає помічників: ${r.helpers.join(', ')}`);
    if (r.frames <= 0) bad.push('кадри стали');
    if (r.crash) bad.push('екран «Гра зламалась»');
    if (errs.length) bad.push(`помилки: ${errs.slice(0, 3).join(' | ')}`);
    if (bad.length) failures.push(`${form}: ${bad.join('; ')}`);
    console.log(`${form.padEnd(9)} ${bad.length ? 'ПРОВАЛ — ' + bad.join('; ') : 'ок'}`);
  } catch (e) {
    failures.push(`${form}: ${e.message.split('\n')[0]}${errs.length ? ' | ' + errs[0] : ''}`);
    console.log(`${form.padEnd(9)} ПРОВАЛ — ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
await server.close();
if (failures.length) {
  console.log(`\nloottest: ПРОВАЛ\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nloottest: OK — 3 форми, усі трофеї, удар по слизаку, помилок немає');
