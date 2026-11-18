// Страховка бою (рефакторинг Combat): кожна основна зброя з повною прокачкою, шляпа до максимуму (дві), «Ядовита морда» і «Павутина».
// Поруч зі слизаком ставимо безсмертних кажанів і дивимось: зброя стріляє / рубає, снаряди влучають з ефектами трофеїв,
// шляпи й міні-сокира б'ють, вигляд зброї правильний, кадри йдуть, помилок немає.
// Бот playtest зазвичай грає стартовим пострілом без трофеїв, тож сокиру, дробовик, чакру, шляпи й міні-сокиру не ходить.
// Використання: node scripts/combattest.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { BALANCE } from '../src/config/balance.js';

const WU = BALANCE.weaponUpgrades;
// стільки прокачок — і в сокири з'являється міні-сокира; етап 14 — у кожної зброї відкрито останню віху поведінки
const UPGRADES = { axe: WU.axe.miniAxeAt, chakra: WU.axe.miniAxeAt, shotgun: WU.shotgun.ricochetAt, lightning: WU.lightning.blastAt, fire: WU.fire.explodeAt, boomerang: WU.boomerang.shieldAt };
// шляпа до maxPicks — тоді їх дві
// і сюрикени до maxPicks (фідбек-6 п.8)
const SHURIKENS = BALANCE.skills.shuriken;
const LOOT = `${Array(BALANCE.skills.hat.maxPicks).fill('hat').join(',')},${Array(SHURIKENS.maxPicks).fill('shuriken').join(',')},loot:venom,loot:web`;
const WEAPONS = ['start', 'axe', 'chakra', 'shotgun', 'lightning', 'fire', 'boomerang'];
const NO_PROJECTILES = new Set(['axe', 'lightning', 'boomerang']); // б'ють без снарядів гравця

const server = await createServer({ server: { port: 5500 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const failures = [];
for (const weapon of WEAPONS) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  try {
    const ups = weapon === 'start' ? '' : Array(UPGRADES[weapon]).fill(`upgrade:${weapon}`).join(',') + ',';
    const q = weapon === 'start' ? `?cards=${LOOT}` : `?weapon=${weapon}&cards=${ups}${LOOT}`;
    await page.goto(base + q);
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
    const r = await page.evaluate(async () => {
      const s = window.game.scene.getScene('Game');
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const { default: Bat } = await import('/src/entities/Bat.js');
      s.spawnEnemies = () => {}; // лише наші кажани
      s.health = { ...s.health, invulnerableUntil: Number.MAX_SAFE_INTEGER };
      const a = { shots: 0, swings: 0, venomTint: 0, webShots: 0, hitsFx: 0, hits: 0, familiarHits: 0, ringHits: 0, zaps: 0, throws: 0, maxBoomerangs: 0, burnHits: 0, bounceShots: 0, chainHits: 0 };
      // етап 14: розряди й кидки — без снарядів
      const zap = s.combat.fireLightning.bind(s.combat);
      s.combat.fireLightning = (...x) => {
        a.zaps++;
        return zap(...x);
      };
      const thr = s.combat.throwBoomerang.bind(s.combat);
      s.combat.throwBoomerang = (...x) => {
        a.throws++;
        const r = thr(...x);
        a.maxBoomerangs = Math.max(a.maxBoomerangs, s.combat.boomerangs.length);
        return r;
      };
      const ringSet = s.combat.ring.lastHit.set.bind(s.combat.ring.lastHit);
      s.combat.ring.lastHit.set = (...x) => {
        a.ringHits++;
        return ringSet(...x);
      };
      const shotAdd = s.playerProjectiles.add.bind(s.playerProjectiles);
      s.playerProjectiles.add = (p, ...rest) => {
        a.shots++;
        if (p.texture?.key === 'webShot') a.webShots++;
        if (p.tintTopLeft === 0x9cff3a) a.venomTint++;
        if (p.bounceMul) a.bounceShots++;
        return shotAdd(p, ...rest);
      };
      const swing = s.combat.weaponView.swing.bind(s.combat.weaponView);
      s.combat.weaponView.swing = (...x) => {
        a.swings++;
        return swing(...x);
      };
      // шляпи й міні-сокира кличуть damage() при кожному ударі (fx = null буває й у тику отрути — тому не за ним)
      for (const f of [...s.combat.hats, s.combat.miniAxe].filter(Boolean)) {
        const d = f.o.damage;
        f.o.damage = () => {
          a.familiarHits++;
          return d();
        };
      }
      const bats = [];
      // кажан на лінії кільця сюрикенів: фідбек-7 збільшив радіус кільця до 124 px, і кажани поруч (~92 px) кільцем
      // більше не діставались — страховка падала на main (етап 14)
      const { shurikenStats } = await import('/src/systems/Skills.js');
      const ringR = shurikenStats(s.progression.picks.shuriken ?? 0).radius;
      const place = () => {
        for (const b of bats) {
          // безсмертні й на місці: поруч зі слизаком, у радіусі сокири
          b.hp = 1e6;
          if (b.body) b.body.setVelocity(0, 0);
          if (b.side === 'O') b.setPosition(s.player.x, s.player.y - ringR);
          else b.setPosition(s.player.x + (b.side === 'L' ? -60 : 60), s.player.y - 70);
        }
      };
      for (const side of ['L', 'R', 'O']) {
        const b = new Bat(s, { x: s.player.x, y: s.player.y - 70 });
        b.side = side;
        const take = b.takeHit.bind(b);
        b.takeHit = (dmg, fx, now) => {
          a.hits++;
          if (fx && fx.root) a.hitsFx++; // «Павутина» дає root у кожному влучанні основної зброї
          if (fx && fx.burn) a.burnHits++;
          if (side === 'L' && fx && fx.root && s.progression.arsenal.main === 'lightning') a.chainHits++;
          return take(dmg, fx, now);
        };
        s.spawnEnemy(b);
        bats.push(b);
      }
      for (let i = 0; i < 60; i++) {
        place();
        await wait(100);
      }
      const f0 = window.game.loop.frame;
      await wait(600);
      return {
        ...a,
        hats: s.combat.hats.length,
        blades: s.combat.ring.blades.length,
        miniAxe: Boolean(s.combat.miniAxe),
        main: s.progression.arsenal.main ?? 'start',
        view: s.combat.weaponView.main ?? null,
        frames: window.game.loop.frame - f0,
        crash: /Гра зламалась/.test(document.body.innerText),
        alive: !s.dead,
      };
    });
    const bad = [];
    if (r.main !== weapon) bad.push(`основна зброя ${r.main}, чекали ${weapon}`);
    if (weapon === 'axe') {
      if (r.swings < 2) bad.push(`розмахів сокири ${r.swings}`);
      if (!r.miniAxe) bad.push('немає міні-сокири');
    } else if (weapon === 'lightning') {
      if (r.zaps < 3) bad.push(`розрядів ${r.zaps}`);
      if (r.chainHits < 2) bad.push(`ланцюг не дістав обох кажанів (${r.chainHits})`);
    } else if (weapon === 'boomerang') {
      if (r.throws < 2) bad.push(`кидків ${r.throws}`);
      if (r.maxBoomerangs < 2) bad.push(`бумерангів у повітрі ${r.maxBoomerangs}, чекали 2 (twinAt)`);
    } else if (weapon === 'fire') {
      if (r.shots < 3) bad.push(`вогняних куль ${r.shots}`);
      if (r.burnHits < 2) bad.push(`підпалів ${r.burnHits}`);
    } else {
      if (r.shots < 3) bad.push(`пострілів ${r.shots}`);
      if (weapon === 'shotgun' && r.bounceShots !== r.shots) bad.push(`рикошетних дробинок ${r.bounceShots} з ${r.shots}`);
      if (r.venomTint !== r.shots) bad.push(`кислотних пострілів ${r.venomTint} з ${r.shots}`);
      if (r.webShots !== r.shots) bad.push(`павутинних пострілів ${r.webShots} з ${r.shots}`);
    }
    if (weapon !== 'axe' && r.miniAxe) bad.push('міні-сокира без сокири');
    if (r.hitsFx < 2) bad.push(`влучань основною зброєю з ефектом павутини ${r.hitsFx}`);
    if (r.familiarHits < 1) bad.push('шляпи / міні-сокира не влучили');
    if (r.hats !== 2) bad.push(`шляп ${r.hats}, чекали 2`);
    const wantBlades = SHURIKENS.counts[SHURIKENS.maxPicks - 1];
    if (r.blades !== wantBlades) bad.push(`сюрикенів ${r.blades}, чекали ${wantBlades}`);
    if (r.ringHits < 2) bad.push(`удари кільця сюрикенів ${r.ringHits}`);
    if (r.frames <= 0) bad.push('кадри стали');
    if (r.crash) bad.push('екран «Гра зламалась»');
    if (!r.alive) bad.push('слизак помер');
    if (errs.length) bad.push(`помилки: ${errs.slice(0, 3).join(' | ')}`);
    if (bad.length) failures.push(`${weapon}: ${bad.join('; ')}`);
    const stat = `постріли ${r.shots}, розмахи ${r.swings}, розряди ${r.zaps}, кидки ${r.throws}, влучання ${r.hits} (з павутиною ${r.hitsFx}, підпали ${r.burnHits}, помічники ${r.familiarHits}, кільце ${r.ringHits})`;
    console.log(`${weapon.padEnd(9)} ${bad.length ? 'ПРОВАЛ — ' + bad.join('; ') : 'ок'} — ${stat}`);
  } catch (e) {
    failures.push(`${weapon}: ${e.message.split('\n')[0]}${errs.length ? ' | ' + errs[0] : ''}`);
    console.log(`${weapon.padEnd(8)} ПРОВАЛ — ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
await server.close();
if (failures.length) {
  console.log(`\ncombattest: ПРОВАЛ\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\ncombattest: OK — 7 зброй (з віхами поведінки), шляпи, міні-сокира, трофеї на снарядах, помилок немає');
