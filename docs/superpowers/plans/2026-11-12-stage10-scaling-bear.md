# Етап 10: посилення ворогів, ведмідь-міні-бос, фідбек-4 — план

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (виконує Claude сам у цьому чаті — користувач сказав «розпочинай»). Кроки — чекбокси.

**Goal:** реалізувати специфікацію §10 одним PR з гілки `feat/v2-10-scaling-bear`.

**Architecture:** уся нова логіка — чисті функції в `src/systems/*` з тестами (`Scaling.js`, `BearPlanner.js`, `Heart.js`, доповнення `Cycle.js`, `Progression.js`, `Weapons.js`, `BossPlanner.js`). Сутності й `GameScene` лише читають ці функції. Числа — тільки в `src/config/balance.js` (`scaling`, `traits`, `bearBoss`, `heart`).

**Tech Stack:** Phaser 4, Vite, Vitest, Capacitor 8. Node ≥ 22.

**Spec:** `docs/superpowers/specs/2026-11-07-slime-climb-v2-design.md` §10.

## Global Constraints
- Без чужих персонажів, логотипів і музики. Арт — піксель-арт кодом у `src/art`, PNG-заміни без правки коду.
- Баланс — лише `balance.js`. Логіка — без Phaser, з тестами.
- Безпечна стіна: на обох стінах одночасно перешкод немає.
- Українською в усіх текстах гри: «Зимова летюча миша», «Білий ведмідь».

## Review Focus
1. Бос помирає, коли його снаряд ще летить → снаряд зникає в той самий кадр (тест: `bossCleanup` для кожного боса).
2. Ведмідь у стрибку вилітає за край → повертається з протилежного боку, не губиться за екраном назавжди (тест фаз `BearPlanner`).
3. Сердечко при повних життях → не з'являється, таймер чекає (тест `Heart`).
4. Нескінченна прокачка → інтервал не нижче `minFireIntervalMs`, радіус сокири не більше ½ ширини (тест `Weapons`).
5. Старт `?winter=1` / `?shkodko=1` → ведмедя немає, Шкодько як був (тест `Cycle`).

---

### Task 1: Масштабування по біомах і колах
**Files:** `src/config/balance.js` (`scaling`, `traits`), `src/systems/Cycle.js`, `src/systems/Progression.js`, `src/entities/Enemy.js`, `src/entities/Bat.js`, `tests/cycle.test.js`, `tests/wallWalkers.test.js`.
**Interfaces (Produces):**
- `biomeIndex(seg) -> number` = `seg.loop*3 + {cave:0,winter:1,bamboo:2}[seg.biome]`.
- `enemyHp(base, biomeIdx)` = `max(1, round(base*1.15^biomeIdx))`; `bossHp(base, loop)` = `max(1, round(base*1.5^loop))`.
- `enhanced(loop) -> boolean` = `loop >= 1`.
- `killXp(type, { loop, biome })`: боси ×`bossHpMul^loop`? Ні — досвід боса ×`biomeHpMul^biome` як і звичайних (досвід росте плавно).
- `Enemy`: `this.enhanced`, зірочка `traitStar` над посиленим, відтінок `TRAIT_TINT`.
- [ ] Тести: `biomeIndex({loop:1,biome:'winter'}) === 4`; `enemyHp(4, 2) === 5`; `bossHp(55, 1) === 83`; `enhanced(0) === false`.
- [ ] Реалізація, `npm test` зелений, коміт.

### Task 2: Досвід, лікування, перший лев, подарунок без змін
**Files:** `balance.js` (`xpGrowthLate`, `xpLateFrom: 7`, `lion.from: 6`), `Progression.js` (`xpToNext`), `src/systems/Health.js` (`levelHeal(level)`), `GameScene.gainXp`, `tests/progression.test.js`, `tests/health.test.js`.
- `xpToNext(level)`: для `level ≤ 7` як було; далі `xpToNext(7) * 1.10^(level-7)`.
- `healForLevels(fromLevel, toLevel) -> number`: рівні ≤ 7 — по 1; ≥ 8 — лише парні.
- [ ] Тести: `xpToNext(8) === round(xpToNext(7)*1.1)`; `healForLevels(6, 9) === 2` (7 і 8); `healForLevels(9, 10) === 1`.
- [ ] Реалізація, коміт.

### Task 3: Зброя без межі
**Files:** `balance.js` (`weapons.axe.steps: 1`, `weaponUpgrades.max: Infinity`, `axe.radiusStep: 1.05`, `axe.radiusMaxFrac: 0.5`, `axe.tiers: [0,3,6,9,12]`), `Weapons.js`, `Progression.js` (`rollUpgrade`), `WeaponView.js`, `src/art/sprites/axe.js` (кадри `tier0…tier4`), `CardText.js` (без «/5»), `tests/weapons.test.js`.
- `axeRadius(width, up) = min(width*radiusFrac*1.05^up, width*0.5)`.
- `upgradeIntervalMul` не дає інтервалу менше `minFireIntervalMs` — нова `effectiveInterval(main, baseMs, up)`.
- `axeTier(up) -> 0..4`.
- [ ] Тести: `axeRadius(720, 100) === 360`; `effectiveInterval('shotgun', 1000, 100) >= 250`; `axeTier(2)===0`, `axeTier(3)===1`, `axeTier(40)===4`; `rollUpgrade` після 20 прокачок все ще дає картку.
- [ ] Реалізація, коміт.

### Task 4: Сердечко
**Files:** `balance.js` (`heart: { firstSec: 60, minSec: 20, maxSec: 70, spikeGapPx: 120 }`), `src/systems/Heart.js`, `GameScene` (спавн, підбір), `Codex.js`, `tests/heart.test.js`.
- `createHeartState(rng)`; `heartDue(state, { tSec, livesFull, fighting, fightId }, rng) -> { state, spawn }`.
- `heartSpot(side, yCandidates, spikes, gap)` — y без шипа ближче за gap.
- [ ] Тести: до 60 с — ні; повні життя — ні, а таймер не рухається; у бою одного `fightId` — щонайбільше одне; інтервали в [20, 70].
- [ ] Реалізація, коміт.

### Task 5: Ельф, льодяник, зимова миша, пінгвіни
**Files:** `balance.js` (`elf.scale 1.4`, `candy.scale 2`, `winter.bat.hp 6`, `penguin` нові `warnMs 400`, `slideSpeed 420`, `wraps 1`), `Elf.js`, `Candy.js`, `Bat.js` (назва), `Penguin.js` (діагональ), `GameScene.spawnEnemies` (пінгвіни без черги ходоків), `Codex.js`, тести `codex`, `biome`.
- [ ] Реалізація, `npm test`, коміт.

### Task 6: Ведмідь-міні-бос
**Files:** `balance.js` (`bearBoss`), `src/systems/BearPlanner.js`, `src/systems/Cycle.js` (відрізок `bear` у зимі), `src/entities/BearBoss.js` (+ `BearAura`), `GameScene` (`BOSSES.bear`, без трофеїв і без бонусу Шагів), `BossIntro.js`, `Music.js` (`introBear`), `Meta` (`bear3`, `stepsPerKill.bear 30`), `tests/bear.test.js`, `tests/cycle.test.js`.
- `nextSegment`: павучиха → `{biome:'winter', boss:'bear', atSec: kill+90}` → `{boss:'shkodko', atSec: max(spiderKill+180, bearKill+45)}`.
- `BearPlanner`: `bearSeries(enhanced) -> jumps (2 | 3)`, `auraBlocks(aura)`, `batsDue(hpFrac, done)`.
- [ ] Тести: цикл відрізків; `?shkodko=1` без ведмедя; `batsDue(0.19,false)` true, `(0.19,true)` false; серія 2/3.
- [ ] Реалізація, коміт.

### Task 7: Боси: павучиха нижче, очищення атак, +1 атака з кола 1, властивості ворогів
**Files:** `SpiderBoss.js` (`strikeBelowFeetPx 200`), `BossPlanner.isSpitAttack(n, rage, enhanced)`, `ShkodkoBoss` (`volleyEveryMs`), `KolyaBody` (парний ривок), `GameScene.onBossKilled` (усе з `bossOwned`), `Lion`, `Bat`, `Plant`, `Elf`, `Ninja`, `Lantern`, `Slug`, `tests/boss.test.js`.
- `bossOwned` — прапорець на снарядах і прислужниках боса; `onBossKilled` знищує всі з прапорцем.
- [ ] Тести: `isSpitAttack(2,false,true)` true; `isSpitAttack(2,false,false)` false.
- [ ] Реалізація, коміт.

### Task 8: Довідник, бот-плейтест, перевірки, PR
- `Codex.cycleFact` під нові правила; записи «Зимова летюча миша», «Білий ведмідь» (міні-бос), «Сердечко».
- `scripts/playtest.mjs --bear`.
- `npm test`, `npm run build`, бот: печера, `--winter`, `--bear`, `--bamboo`. Перевірка в браузері `?bear=1`.
- §10.8 «Як зроблено», CLAUDE.md «Стан», PR, злиття, APK.
