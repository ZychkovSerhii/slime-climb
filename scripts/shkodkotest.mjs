// Страховка Шкодька по фазах (фідбек-6, переробка): bosstest вбиває боса в обхід фаз, бот Шкодька не вбиває.
// Тут: ривок фази 1 (блимання → швидкий підхід → укус), дощ подарунків з цукерками й лікуванням, потяг-змійка
// з пірнанням і стрілкою, розбиті вагони → одразу лють (без оглушення). Слизак безсмертний, автоатака вимкнена.
// Використання: node scripts/shkodkotest.mjs
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
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(base + '?shkodko=1');
let ready = false;
for (let i = 0; i < 120 && !ready; i++) {
  const st = await page.evaluate(() => {
    const s = window.game?.scene.getScene('Game');
    if (!s || !window.game.scene.isActive('Game')) return 'menu';
    if (s.introOpen) return 'intro';
    return s.enemies.getChildren().some((e) => e.type === 'shkodko') && !s.paused ? 'ok' : 'wait';
  });
  ready = st === 'ok';
  if (st === 'menu') await page.mouse.click(180, 320);
  if (st === 'intro') await page.mouse.click(180, 560);
  if (!ready) await page.waitForTimeout(400);
}
const bad = ready ? await page.evaluate(async () => {
  const s = window.game.scene.getScene('Game');
  const S = (await import('/src/config/balance.js')).BALANCE.shkodko;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      if (f()) return true;
      await wait(50);
    }
    return false;
  };
  const out = [];
  s.health = { ...s.health, invulnerableUntil: Number.MAX_SAFE_INTEGER };
  s.combat.autoFire = () => {};
  const b = s.enemies.getChildren().find((e) => e.type === 'shkodko');
  // фаза 1: наступна зупинка — на гравця
  await until(() => b.state === 'pause', 8000);
  b.stopNo = S.dance.p1.aimEvery - 1;
  if (!(await until(() => b.state === 'windup', 6000))) out.push('фаза 1: немає блимання перед ривком');
  else if (!(await until(() => b.target?.lunge && b.state === 'dance', 3000))) out.push('фаза 1: ривку немає');
  else {
    const v = Math.hypot(b.body.velocity.x, b.body.velocity.y);
    if (v < S.dance.p1.speed * 2) out.push(`фаза 1: ривок ${Math.round(v)} px/с, чекали ~×${S.dance.p1.aimSpeedMul}`);
  }
  // фаза 3: дощ — подарунки швидкі, цукерки летять, ціль провалена → лікування
  b.hp = b.maxHp * 0.49;
  b.checkPhase();
  if (!(await until(() => b.state === 'rush', 6000))) out.push('дощ не почався');
  const candies = () => s.enemyProjectiles.getChildren().filter((p) => p.active && p.texture.key === 'candy');
  if (!(await until(() => candies().length > 0, 6000))) out.push('під час дощу немає цукерок');
  else if (Math.abs(candies()[0].scaleX - S.candy.scale) > 0.01) out.push(`льодяник ×${candies()[0].scaleX}, чекали ×${S.candy.scale}`);
  const gift = s.pickups.getChildren().find((g) => g.active && g.body?.velocity.y > 0);
  if (gift && Math.abs(gift.body.velocity.y - S.rush.fallSpeed) > 1) out.push(`подарунок падає ${gift.body.velocity.y}, чекали ${S.rush.fallSpeed}`);
  for (const g of s.pickups.getChildren().slice()) g.destroy(); // нічого не зібрано
  const hp0 = b.hp;
  if (!(await until(() => b.rushDone, 20000))) out.push('дощ не скінчився');
  else if (b.hp - hp0 < S.rush.healFail * b.maxHp - 1 && b.hp < S.rush.healCap * b.maxHp - 1) out.push(`після провалу +${Math.round(b.hp - hp0)} HP, чекали +${S.rush.healFail * 100}%`);
  // фаза 4: потяг-змійка
  b.hp = b.maxHp * 0.29;
  b.checkPhase();
  if (!(await until(() => b.state === 'train' && b.train, 6000))) out.push('потяг не з\'явився');
  else {
    const t = b.train;
    if (t.wagons.length !== S.train.wagons) out.push(`вагонів ${t.wagons.length}, чекали ${S.train.wagons}`);
    if (Math.abs(t.wagons[0].scaleX - S.train.carScale) > 0.01) out.push(`вагон ×${t.wagons[0].scaleX}`);
    if (!(await until(() => t.snake.dives.length > 0, 25000))) out.push('змійка не пірнула');
    else {
      const d = t.snake.dives[0];
      if (!(await until(() => t.snake.headD > d.startD - 300, 25000))) out.push('паровоз не дійшов до пірнання');
      const bottom = await until(() => t.snake.headD >= d.bottomD, 25000);
      if (!bottom) out.push('паровоз не дійшов до низу');
      else if (Math.abs(t.loco.y - s.player.baseY) > 40) out.push(`на дні пірнання паровоз на y ${Math.round(t.loco.y)}, гравець ${Math.round(s.player.baseY)}`);
    }
    for (const w of t.wagons) if (w.active) w.takeHit(1e6, null, s.nowMs);
    if (!(await until(() => b.trainDone, 5000))) out.push('потяг не скінчився після розбитих вагонів');
    else if (!b.rage || b.invulnerable) out.push(`після потяга лють ${b.rage}, невразливий ${b.invulnerable} (чекали одразу лють)`);
  }
  if (/Гра зламалась/.test(document.body.innerText)) out.push('екран «Гра зламалась»');
  return out;
}) : ['бій зі Шкодьком не почався'];
if (errs.length) bad.push(`помилки: ${errs.slice(0, 3).join(' | ')}`);
await browser.close();
await server.close();
if (bad.length) {
  console.log(`shkodkotest: ПРОВАЛ\n- ${bad.join('\n- ')}`);
  process.exit(1);
}
console.log('shkodkotest: OK — ривок, дощ з цукерками й лікуванням, змійка з пірнанням, лють без оглушення');
