// Бот-плейтест: справжня гра в headless Chromium, бот сам стрибає і вибирає картки.
// Смерть вимкнена: рахуємо кожен удар (з джерелом і часом), щоб оцінити, чи реально дожити до боса і вбити його.
// Використання: node scripts/playtest.mjs [--seconds 160] [--runs 1] [--no-enemies] [--weapon axe|chakra|shotgun] [--cards hat,hat,extraLife] [--winter]
// --winter — одразу зимовий біом без павучихи (?winter=1)
// Потрібен браузер Playwright (npx playwright install chromium) або CHROME_PATH.
import { createServer } from 'vite';
import { chromium } from 'playwright';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};
const SECONDS = arg('--seconds', 160);
const RUNS = arg('--runs', 1);
const NO_ENEMIES = process.argv.includes('--no-enemies');
const wIdx = process.argv.indexOf('--weapon');
const WEAPON = wIdx > -1 ? process.argv[wIdx + 1] : null; // з цією зброєю з першої секунди
const cIdx = process.argv.indexOf('--cards');
const CARDS = cIdx > -1 ? process.argv[cIdx + 1] : null; // з цими картками з першої секунди (?cards=)
const WINTER = process.argv.includes('--winter');

// Код бота виконується всередині сторінки (dev-режим дає window.game)
function installBot() {
  const g = window.game;
  const s = g.scene.getScene('Game');
  const report = { deaths: [], hits: [], bossStart: null, bossKilled: null, picks: [], maxLevel: 1 };
  window.__report = report;

  // безсмертя з чесним підрахунком: справжня логіка шкоди, але життя відновлюються
  const origHurt = s.hurtPlayer.bind(s);
  s.hurtPlayer = function () {
    if (this.paused || this.dead) return false;
    const before = this.health.invulnerableUntil;
    const wouldDie = this.health.lives <= 1 && this.nowMs >= before;
    // перед «смертельним» ударом повертаємо життя — гра йде далі, а смерть записуємо
    if (wouldDie) this.health = { ...this.health, lives: 2 }; // повернули 1 життя, щоб гра йшла далі
    const took = origHurt();
    if (this.health.invulnerableUntil === before) return took; // невразливість — удару не було
    if (wouldDie) { report.deaths.push(+this.elapsedSec.toFixed(1)); report.stepsAtDeath ??= this.runSteps; }
    const p = this.player;
    let src = '?';
    let best = Infinity;
    for (const grp of [this.hazards, this.enemies, this.enemyProjectiles]) {
      for (const o of grp.getChildren()) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < best) {
          best = d;
          src = grp === this.hazards ? 'spike' : grp === this.enemyProjectiles ? 'plantBullet' : o.type;
        }
      }
    }
    report.hits.push({ t: +this.elapsedSec.toFixed(1), src });
    return took;
  };

  // фази боса: коли почався і скінчився рій (невразливість), коли лють
  report.boss = [];
  report.winter = { roars: 0, gifts: 0, santa: 0 };
  const origRoar = s.roarPlayer.bind(s);
  s.roarPlayer = function () {
    report.winter.roars += 1;
    return origRoar();
  };
  const origGift = s.collectGift.bind(s);
  s.collectGift = function (g) {
    if (g.active) report.winter.gifts += 1;
    return origGift(g);
  };
  s.events.on('hud:banner', (b) => {
    if (b?.text === 'Санта!') report.winter.santa += 1;
  });
  let immune = false;
  s.events.on('hud:boss', (b) => {
    if (b && b.invulnerable !== immune) {
      immune = b.invulnerable;
      report.boss.push(`${immune ? 'swarm' : 'swarmEnd'}@${s.elapsedSec.toFixed(1)}`);
    }
  });
  s.events.on('boss:rage', () => report.boss.push(`rage@${s.elapsedSec.toFixed(1)}`));

  const HALF_P = 24;
  const MARGIN = 10; // запас прогнозу, px
  // тривалість стрибка залежить від стану (ричання ведмедя — утричі довший)
  const jumpT = () => 0.38 / (s.player.speedMul || 1);
  const HORIZON = 1.2;

  /** Чи зачепить об'єкт o гравця, якщо той стоїть у (x, y) в момент t (сек від зараз). */
  function hitsAt(o, x, y, t, scroll) {
    const bw = (o.displayWidth || 40) / 2;
    const bh = (o.displayHeight || 40) / 2;
    const vx = o.body ? o.body.velocity.x : 0;
    let vy = o.body ? o.body.velocity.y : 0;
    if (o.scrollsWithWorld !== false) vy += scroll;
    const ox = o.x + vx * t;
    const oy = o.y + vy * t;
    return Math.abs(ox - x) < bw + HALF_P + MARGIN && Math.abs(oy - y) < bh + HALF_P + MARGIN;
  }

  // переслідувачів (кажан, павучок) здалеку збиває автострільба — як і людина, бот зважає на них лише поблизу
  const CHASERS = new Set(['bat', 'smallSpider']);
  const CHASER_RANGE = 250;
  function threats() {
    const p = s.player;
    return [...s.hazards.getChildren(), ...s.enemies.getChildren(), ...s.enemyProjectiles.getChildren()].filter(
      (o) => o.active && !o.harmless && !(CHASERS.has(o.type) && Math.hypot(o.x - p.x, o.y - p.y) > CHASER_RANGE),
    );
  }

  /** Перший момент удару, якщо стояти на стіні side від t0 до t1. */
  function dangerOnWall(side, t0, t1, list) {
    const x = s.player.wallX(side);
    const y = s.player.baseY;
    for (let t = t0; t <= t1; t += 0.03) {
      for (const o of list) if (hitsAt(o, x, y, t, s.currentScroll)) return t;
    }
    return Infinity;
  }

  /** Скільки секунд безпечно, якщо стрибнути зараз: політ + стояння на іншій стіні. */
  function safeIfJump(list, horizon) {
    const from = s.player.wallX(s.player.side);
    const other = s.player.side === 'left' ? 'right' : 'left';
    const to = s.player.wallX(other);
    for (let t = 0; t <= jumpT(); t += 0.03) {
      const k = t / jumpT();
      const x = from + (to - from) * k;
      const y = s.player.baseY - 80 * Math.sin(Math.PI * k);
      for (const o of list) if (hitsAt(o, x, y, t, s.currentScroll)) return t;
    }
    return dangerOnWall(other, jumpT(), horizon, list);
  }

  const STEP = 0.05;
  const N = Math.round(2.5 / STEP);

  /** Пошук на 2,5 с уперед: чи можна вижити, якщо зараз стояти / стрибнути. */
  function plan(list) {
    const J = Math.round(jumpT() / STEP);
    const sides = ['left', 'right'];
    const scroll = s.currentScroll;
    const y = s.player.baseY;
    const xs = { left: s.player.wallX('left'), right: s.player.wallX('right') };
    const hitWall = (side, i) => list.some((o) => hitsAt(o, xs[side], y, i * STEP, scroll));
    const hitJump = (side, i) => {
      const other = side === 'left' ? 'right' : 'left';
      // реальна затримка: твін зрушує слизака лише за 1–2 кадри — один крок він ще на стіні
      if (hitWall(side, i + 1)) return true;
      for (let k = 0; k <= J; k++) {
        const f = k / J;
        const x = xs[side] + (xs[other] - xs[side]) * f;
        const yy = y - 80 * Math.sin(Math.PI * f);
        if (list.some((o) => hitsAt(o, x, yy, (i + k) * STEP, scroll))) return true;
      }
      return false;
    };
    const memo = new Map();
    const ok = (side, i) => {
      if (i >= N) return true;
      const key = side + i;
      if (memo.has(key)) return memo.get(key);
      let r = false;
      if (!hitWall(side, i)) {
        r = ok(side, i + 1);
        if (!r && !hitJump(side, i)) r = ok(side === 'left' ? 'right' : 'left', i + J);
      }
      memo.set(key, r);
      return r;
    };
    const side = s.player.side;
    const stayOk = !hitWall(side, 0) && ok(side, 1);
    if (stayOk) return 'stay';
    const jumpOk = !hitJump(side, 0) && ok(sides[sides.indexOf(side) ^ 1], J);
    return jumpOk ? 'jump' : 'panic';
  }

  s.events.on('postupdate', () => {
    if (s.paused || s.dead || s.player.isJumping) return;
    if (s.bossActive && report.bossStart === null) report.bossStart = +s.elapsedSec.toFixed(1);
    report.maxLevel = Math.max(report.maxLevel, s.progression.level);
    const list = threats();
    let decision = plan(list);
    // як людина: ведмідь став на лапи і слизак у колі — тікаємо на іншу стіну, якщо там безпечно
    const rearing = s.enemies.getChildren().find((o) => o.type === 'bear' && o.rearUntil != null && Math.hypot(o.x - s.player.x, o.y - s.player.y) < 300);
    if (rearing && decision === 'stay') {
      const other = s.player.side === 'left' ? 'right' : 'left';
      const ox = s.player.wallX(other);
      if (Math.hypot(rearing.x - ox, rearing.y - s.player.baseY) > 300 && safeIfJump(list, 1.2) > 1.0) decision = 'jump';
    }
    report.decisions = report.decisions || {};
    report.decisions[decision] = (report.decisions[decision] || 0) + 1;
    if (decision === 'jump') s.player.jump();
    else if (decision === 'panic') {
      // хто заважає: типи об'єктів, що влучили б, якщо стояти, у найближчі 0.6 с
      const x = s.player.wallX(s.player.side);
      report.panicBy = report.panicBy || {};
      for (const o of list) {
        for (let t = 0; t < 2.5; t += 0.1) {
          if (hitsAt(o, x, s.player.baseY, t, s.currentScroll)) {
            const k = s.hazards.contains(o) ? 'spike' : o.type || 'bullet';
            report.panicBy[k] = (report.panicBy[k] || 0) + 1;
            break;
          }
        }
      }
      // жодного безпечного варіанту в прогнозі: обираємо, де небезпека пізніше
      const stay = dangerOnWall(s.player.side, 0, 2, list);
      const jump = safeIfJump(list, 2);
      if (jump > stay) s.player.jump();
    }
  });

  s.events.on('enemy:killed', (e) => {
    if (e.type === 'boss') report.bossKilled = +s.elapsedSec.toFixed(1);
    report.kills = report.kills || {};
    report.kills[e.type] = (report.kills[e.type] || 0) + 1;
  });

  // вибір картки: урон > швидкість атаки > сповільнення
  const order = ['damage', 'attackSpeed', 'slow'];
  setInterval(() => {
    const lu = g.scene.getScene('LevelUp');
    if (!lu.sys.isActive()) return;
    const cards = lu.sys.settings.data.cards;
    const pick = order.find((c) => cards.includes(c)) ?? cards[0]; // трофеї павучихи — перший
    const rects = lu.children.list.filter((o) => o.type === 'Rectangle' && o.input && o.width < g.scale.width);
    const idx = cards.indexOf(pick);
    if (rects[idx]) {
      report.picks.push(pick);
      rects[idx].emit('pointerdown');
    }
  }, 400);
}

const server = await createServer({ server: { port: 5180 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const results = [];
for (let r = 0; r < RUNS; r++) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const q = [WEAPON && `weapon=${WEAPON}`, CARDS && `cards=${CARDS}`, WINTER && 'winter=1'].filter(Boolean).join('&');
  await page.goto(q ? `${url}?${q}` : url);
  await page.waitForTimeout(800);
  await page.mouse.click(180, 320); // меню → гра
  await page.waitForTimeout(500);
  await page.evaluate(installBot);
  if (NO_ENEMIES) {
    await page.evaluate(() => {
      const s = window.game.scene.getScene('Game');
      s.spawnEnemies = () => {};
      s.bossAtSec = Infinity;
    });
  }
  const t0 = Date.now();
  while (Date.now() - t0 < SECONDS * 1000) {
    await page.waitForTimeout(5000);
    const rep = await page.evaluate(() => ({
      t: +window.game.scene.getScene('Game').elapsedSec.toFixed(0),
      hits: window.__report.hits.length,
    }));
    process.stdout.write(`\r  run ${r + 1}: ${rep.t}s, hits ${rep.hits}   `);
  }
  const rep = await page.evaluate(() => {
    const s = window.game.scene.getScene('Game');
    return { ...window.__report, relics: s.progression.relics, steps: s.runSteps, endT: +s.elapsedSec.toFixed(1), fps: +window.game.loop.actualFps.toFixed(0) };
  });
  rep.errors = errors;
  results.push(rep);
  await page.screenshot({ path: `playtest-${r + 1}.png` });
  await page.close();
  console.log('');
}

for (const [i, rep] of results.entries()) {
  const bySrc = {};
  for (const h of rep.hits) bySrc[h.src] = (bySrc[h.src] || 0) + 1;
  // «смерть» = друге влучання в межах одного життя (після першого — 5 с невразливості, далі ще одне)
  console.log(`\nRun ${i + 1}: played ${rep.endT}s, fps ${rep.fps}, level ${rep.maxLevel}`);
  console.log(`  deaths (with real lives & healing): ${rep.deaths.length ? rep.deaths.join(', ') : 'none'}`);
  console.log(`  hits ${rep.hits.length}:`, JSON.stringify(bySrc));
  console.log(`  hit times:`, rep.hits.map((h) => `${h.t}(${h.src})`).join(' '));
  console.log(`  Шаги: ${rep.steps} (на першій смерті: ${rep.stepsAtDeath ?? '-'}), вбивства: ${JSON.stringify(rep.kills ?? {})}`);
  if (rep.relics) console.log(`  relics: ${rep.relics.join(', ')}`);
  console.log(`  зима: ричань по гравцю ${rep.winter.roars}, подарунків ${rep.winter.gifts}, Санта ${rep.winter.santa}`);
  console.log(`  boss start ${rep.bossStart ?? '-'}, boss killed ${rep.bossKilled ?? '-'}, phases: ${rep.boss.join(' ') || '-'}`);
  console.log(`  picks: ${rep.picks.join(', ')}`, 'decisions', JSON.stringify(rep.decisions), 'panicBy', JSON.stringify(rep.panicBy));
  if (rep.errors.length) console.log('  ERRORS:', rep.errors);
}
await browser.close();
await server.close();
