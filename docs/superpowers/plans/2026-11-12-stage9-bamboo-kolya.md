# Етап 9: «Туманний бамбук» і «Слимак Коля» — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** третій біом у колі (бамбук: ніндзя, ліхтарик-дух, бамбукові кілки, туман), бос «Слимак Коля» з 4 фазами, представлення для всіх трьох босів і трофеї Колі.

**Architecture:** як у 6a/6b. Числа — у `src/config/balance.js` (нові блоки `bamboo`, `kolya`, `kolyaLoot`, вороги в `enemies`). Логіка без Phaser — `src/systems/KolyaPlanner.js`, `KolyaLoot.js`, доповнення `Cycle.js`, `Spawner.js`, `Difficulty.js`, `WallWalkers.js`, `Settings.js`. Сутності — `src/entities/*`, сцена-представлення — `src/scenes/BossIntroScene.js`. Арт — по файлу на спрайт у `src/art/sprites`.

**Tech Stack:** Phaser 4, Vite, Vitest, Playwright (бот-плейтест), Capacitor 8.

**Spec:** `docs/superpowers/specs/2026-11-07-slime-climb-v2-design.md`, §9 (і §0, §6.2, §8 як основа).

## Global Constraints

- Без чужих персонажів, логотипів і музики. Коля — власний світло-рожевий слимак без мушлі з двома ріжками-очима.
- Музика й звук — лише кодом (`Music.js` / `Audio.js`), графіка — піксель-арт кодом, з PNG-заміною (`src/art/png/<key>.png`).
- Усі числа — в `balance.js`. Логіка в `systems/*` без Phaser, з тестами.
- Інваріант «безпечна стіна» (§8) не ламається: на обох стінах одночасно перешкод немає.
- Туман лише на фоні: depth між фоном (−3) і стінами (−1), під шипами, ворогами й снарядами. Вимикається в меню.
- Коло: печера (павучиха) → зима (Шкодько) → бамбук (Коля) → печера, `loop + 1` лише після Колі.
- Коля: HP 110; поділ на 40%, лікування останнього до 15% від maxHp. Нагорода 120 Шагів, досвід 100, досягнення 200/500.
- Новий запис у `balance.js` (ворог, трофей, скін) — запис у `Codex.js` (тест `codex.test.js`).

## Review Focus

1. Удар, що за раз перескакує поріг 80% або 40% (сокира, бомби): подія фази (народження, поділ) не пропускається — HP тримається на порозі (`kolyaHpFloor`), як у Шкодька.
2. Усі три уламки гинуть в одному кадрі: бос мертвий рівно один раз (одна подія `enemy:killed` з `type: 'kolya'`, один трофей). Двоє гинуть в одному кадрі: з'їдання все одно стартує.
3. Застосунок згорнули під час представлення: «Продовжити» не знімає паузу, поки представлення відкрите. Рівень під час представлення не відкриває вікно карток.
4. Коло 1+: HP уламків і лікування рахуються від масштабованого `maxHp`, а не від 110.
5. Старі налаштування без ключа `fog` (і зламаний JSON): туман увімкнений, сніг не губиться.

---

### Task 1: Баланс і коло з трьох біомів

**Files:**
- Modify: `src/config/balance.js`, `src/systems/Cycle.js`, `src/systems/Spawner.js`, `src/systems/Difficulty.js`
- Test: `tests/cycle.test.js`, `tests/spawner.test.js`, `tests/difficulty.test.js`

**Interfaces:**
- Produces: `BALANCE.bamboo { from, spawnBaseMs, bat, fog, transitionMs }`, `BALANCE.kolya {...}`, `BALANCE.kolyaLoot {...}`, `BALANCE.enemies.{ninja, lantern, slugBiter, slugSpitter}`; `firstSegment('bamboo' | 'kolya')`; `nextSegment` після `shkodko` → `{ biome: 'bamboo', boss: 'kolya', atSec: kill + kolya.afterSec, loop }`, після `kolya` → печера `loop + 1`; `BIOME_TYPES.bamboo = ['ninja', 'lantern', 'bat']`; `spawnIntervalMs(type, t, 'bamboo')`.

- [ ] **Step 1:** тести. `nextSegment(shkodkoSeg, 400)` → `{ biome: 'bamboo', boss: 'kolya', atSec: 580, loop: 0 }`; далі `nextSegment(kolyaSeg, 700)` → `{ biome: 'cave', boss: 'spider', loop: 1 }`. `firstSegment('kolya')` → бамбук, `atSec: kolya.debugAtSec`. `firstSegment('bamboo').boss === null`. Бази бамбука ≈ ×0,9 від зими: `spawnBaseMs.lantern === round(winter.elf × 0.9)`, `bat === round(winter.bat × 0.9)`, `ninja === round(winter.penguin × 0.9)`. Існуючий тест «після Шкодька — печера» переписати.
- [ ] **Step 2:** `npx vitest run tests/cycle.test.js tests/spawner.test.js` — FAIL.
- [ ] **Step 3:** реалізація. `kolya.afterSec = 180` (від початку бамбука = смерті Шкодька), `debugAtSec = 6`. Спавн бамбука: `from { lantern: 3, bat: 8, ninja: 10 }`. Кажан у бамбуку — як у зимі (`bamboo.bat = { hp: 2, speedMul: 1.15 }`).
- [ ] **Step 4:** `npm test` — PASS.
- [ ] **Step 5:** commit «Етап 9: баланс і коло з трьох біомів».

### Task 2: Арт бамбука, Колі й трофеїв

**Files:**
- Create: `src/art/sprites/{wallBamboo,stake,ninja,smoke,shuriken,lantern,kolya,slug,slimeSpit,larva,slimeKolya}.js`, `src/art/backgrounds/bambooFog.js`, `src/art/sprites/fog.js` (текстура туману, `draw`)
- Modify: `src/art/palette.js`, `src/art/sprites/index.js`, `src/art/backgrounds/index.js`, `src/art/README.md`
- Test: `tests/art.test.js` (вже валідує всі `SPRITES`)

**Interfaces:**
- Produces: ключі текстур `wallBamboo` (60×64, як `wall`), `stake` (40×40, як `spike`), `bgBamboo`, `fog`; `ninja` (кадри `idle`, `throw`), `smoke` (`puff1/puff2`), `shuriken`, `lantern` (`glow1/glow2`, `blink`), `kolya` (96×64: `crawl1/crawl2`, `squeeze`, `breathe`, `eat`), `slug` (міні: `crawl1/crawl2`, ~утричі більший за кажана за площею), `slimeSpit`, `larva`, `slimeKolya` (48×48, кадри `idle1/idle2/jump` як `slime`).

- [ ] **Step 1:** намалювати сітки; `npx vitest run tests/art.test.js` — PASS (нерівні рядки, колір без палітри, сітка не влазить).
- [ ] **Step 2:** commit «Етап 9: арт бамбука і Колі».

### Task 3: Туман і перемикач у меню

**Files:**
- Create: `src/entities/Fog.js`
- Modify: `src/systems/Settings.js`, `src/scenes/MenuScene.js`
- Test: `tests/settings.test.js`

**Interfaces:**
- Produces: `defaultSettings() → { snow: true, fog: true }`; `new Fog(scene)` з `step(dt, dy)` і `destroy()`; 2 tileSprite шари depth −2,5 і −2,2, alpha з `bamboo.fog`.

- [ ] **Step 1:** тест: `loadSettings` зі сховища `{"snow":false}` → `{ snow: false, fog: true }`; `{"fog":false}` → `fog: false`; зламаний JSON → обидва `true`.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** у меню кнопки «Сніг» і «Туман» в один рядок на висоті 0,91.
- [ ] **Step 4:** commit.

### Task 4: Біом бамбук у сцені, ніндзя і ліхтарик

**Files:**
- Create: `src/entities/Ninja.js`, `src/entities/Lantern.js`, `src/entities/Shuriken.js`
- Modify: `src/systems/WallWalkers.js`, `src/scenes/GameScene.js`, `src/entities/Bat.js`
- Test: `tests/wallWalkers.test.js`, `tests/bamboo.test.js` (новий)

**Interfaces:**
- Produces: `ninjaInterval({ d0, zoneY, scroll, windowSec }) → { from, to }` — світовий відрізок, який гравець проходить за `windowSec` (з запасом `playerSize/2 + spikeBand`); `lanternShouldArm(dist) → boolean`; `ninjaY(rng, height) → number` у `[0.12h, 0.4h]`.

**[рішення плану, відхилення від §9.1]:** ніндзя тримається за стіну на сталій висоті екрана (`scrollsWithWorld = false`) у верхніх 12–40% екрана. Тому сам він гравця не зустріне. Небезпека — сюрикен, і ухилятися від нього треба стрибком на стіну ніндзі. Отже резерв `reserveFree` ставимо **на стіні ніндзі**, на відрізку світу, який гравець пройде за `ninja.smokeMs + максимальний політ сюрикена + 1 с` (`windowSec`). Механізм той самий, що в ходоків: черга, резерв, очікування, поки вже поставлені шипи вийдуть з відрізка (`spikesBlock`). Ніндзя не з'являється, якщо вже є ніндзя на екрані (запит відкидається) або на його стіні є ходок.

- [ ] **Step 1:** тести `ninjaInterval`: `from === d0 − zoneY − margin`, `to === d0 + scroll·windowSec − zoneY + margin`; `ninjaY` у межах для rng 0 і 0.999; `lanternShouldArm(89) === true`, `(91) === false`.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** GameScene: `TEX.bamboo = { bg: 'bgBamboo', wall: 'wallBamboo', spike: 'stake' }`; `enterBiome('bamboo')` створює `Fog` (якщо `settings.fog`), знищує сніг, плашку «Туманний бамбук»; `spawnEnemies` для `ninja` → `requestNinja()`, `lantern` → `new Lantern`, `bat` з `{ biome }`. Ліхтарик: 70 px/с на гравця, за 90 px — 0,8 с блимання, вибух 70 px (`blastHits`), убитий раніше — без вибуху. Ніндзя: дим 0,6 с (невразливий і нешкідливий, поки дим), кидок 1 сюрикена по прямій 260 px/с, через 1,2 с зникає в диму.
- [ ] **Step 4:** `?bamboo=1` у браузері (Playwright): без помилок консолі, видно туман під кілками.
- [ ] **Step 5:** commit.

### Task 5: Логіка Колі (без Phaser)

**Files:**
- Create: `src/systems/KolyaPlanner.js`
- Test: `tests/kolya.test.js`

**Interfaces:**
- Produces:
  - `kolyaPhase(hpFrac, events) → 'p1' | 'birth' | 'p2' | 'split'`; `events = { born, split }`.
  - `kolyaHpFloor(maxHp, events) → number`: до народження `0.8·maxHp`, до поділу `0.4·maxHp`, далі 0.
  - `splitHp(hp, n = 3) → number[]`: сума = `hp`, кожне ≥ 1, різниця ≤ 1.
  - `eatHeal(hp, maxHp) → max(hp, round(0.15·maxHp))`.
  - `snakeX(t, laneMin, laneMax, periodMs) → number` (синусоїда коридором) і `patrolY(t, top, bottom, periodMs)`.
  - `createLungeClock() → { nextAt, busyUntil }`, `lungeDue(clock, now, everyMs) → { clock, go }` — спільний для всіх уламків: одночасно телеграфує або робить ривок лише один, між ривками щонайменше `kolya.lunge.gapMs`.
  - `fanAngles(aim, count, spreadDeg)`.
  - `spitterTarget(player, self, keepPx, minAbovePx) → { x, y }` — точка на відстані `keepPx`, не нижче `player.y − minAbovePx`.

- [ ] **Step 1:** тести: пороги 0,8/0,4 і що фаза не відкочується; `kolyaHpFloor(110, {born:false})` = 88; `splitHp(44)` → `[15, 15, 14]`; `splitHp(2)` → кожне ≥ 1, сума ≥ 3 (мінімум 1 на уламок); `eatHeal(3, 110)` = 17, `eatHeal(3, 149)` = 22 (коло 1); `lungeDue`: два виклики в один момент → `go` лише перший; `fanAngles(0, 3, 15)` симетричне; `spitterTarget` завжди вище гравця.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** commit.

### Task 6: Бос Коля в сцені

**Files:**
- Create: `src/entities/KolyaBoss.js`, `src/entities/KolyaPart.js`, `src/entities/Slug.js`, `src/entities/SlimeSpit.js`
- Modify: `src/entities/Enemy.js` (`BOSS_CFG` + `kolya`, `kolyaPart`), `src/scenes/GameScene.js`, `src/systems/Score.js`, `src/systems/Progression.js` (`killXp`), `src/systems/Meta.js` (без змін логіки, лише баланс)
- Test: `tests/score.test.js`, `tests/progression.test.js`, `tests/meta.test.js`

**Interfaces:**
- Consumes: Task 5.
- Produces: `KolyaBoss` (type `'kolya'`) — контролер: фази 1–2 сам б'ється. На поділі ховається (`invulnerable`, `harmless`, невидимий, тіло вимкнене) і створює 3 `KolyaPart` (type `'kolyaPart'`, 0 досвіду/очок/Шагів). HUD показує сумарне HP уламків. На з'їданні стає останнім уламком: HP `eatHeal`, `invulnerable` 1,5 с, лють. Смерть контролера — єдина подія `enemy:killed` з `'kolya'`. Якщо всі уламки зникли в одному кадрі (контролер бачить 0 живих, а з'їдання ще не було), контролер сам себе вбиває через `takeHit(hp)` з обходом невразливості. `Slug` — `kind: 'biter' | 'spitter'`.

- [ ] **Step 1:** тести: `killPoints('kolya') === kolya.points`, `killXp('kolya') === 100`, `killXp('kolyaPart') === 0`, `stepsForKill('kolya') === 120`; досягнення `kolya1` (200) і `kolya5` (500) з'являються за лічильником `kolya`.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** GameScene: `startBoss` створює `KolyaBoss` для `seg.boss === 'kolya'`; ім'я в плашці; `onBossKilled('kolya')` → трофеї Колі; `onKilled` рахує `kolya` як боса; `clearMap` при поділі прибирає малих слимаків (`scene.events.emit('kolya:split')`).
- [ ] **Step 4:** Playwright `?kolya=1&weapon=axe`: бій доходить до смерті, без помилок консолі, лог фаз.
- [ ] **Step 5:** commit.

### Task 7: Представлення босів

**Files:**
- Create: `src/scenes/BossIntroScene.js`, `src/systems/BossIntro.js`
- Modify: `src/main.js` (сцена), `src/systems/Music.js` (треки `introSpider`, `introShkodko`, `introKolya`: 16 кроків при 120 bpm = 2 с, `loop: false`), `src/scenes/GameScene.js`
- Test: `tests/bossIntro.test.js`, `tests/music.test.js`

**Interfaces:**
- Produces: `bossIntroInfo(boss, loop) → { name, subtitle, sprite, frame, scale, music }` (`subtitle` — `Коло ${loop + 1}`); `introCanSkip(elapsedMs)` (≥ 1000), `introDone(elapsedMs)` (≥ 2500). Подія `intro:closed` у сцені Game. GameScene: `introOpen` блокує зняття паузи з «Продовжити» і відкриття вікна рівня; після закриття — `invulnerableUntil = now + 500`, `playMusic('boss')`. `?intro=1` — представлення павучихи одразу після старту.

- [ ] **Step 1:** тести `bossIntroInfo` для трьох босів (ім'я з `BALANCE`, спрайт існує в `SPRITES`); пороги skip/done; треки intro — одноразові, ~2 с (`trackSteps / (bpm/60·4)` у [1,5; 2,5]).
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** Playwright `?intro=1`: сцена `BossIntro` активна, через 2,6 с — ні, гра не на паузі.
- [ ] **Step 4:** commit.

### Task 8: Трофеї Колі і +50% Шагів

**Files:**
- Create: `src/systems/KolyaLoot.js`
- Modify: `src/systems/ShkodkoLoot.js` (`FORM_IDS` + `'iamkolya'`, `formSkin` → `slimeKolya`), `src/systems/CardText.js`, `src/scenes/GameScene.js`
- Test: `tests/kolyaLoot.test.js`, `tests/shkodkoLoot.test.js`

**Interfaces:**
- Produces: `KOLYA_LOOT_IDS = ['larva', 'iamkolya']`; `canSplit(state, level) → boolean` (раз за рівень: `state.usedAtLevel !== level`); `useSplit(state, level)`; `lootStepsBonus(baseSteps, offered) → offered.length ? 0 : round(baseSteps · 0.5)`.
- «Личинка-помічник»: раз на 1,2 с снаряд `slimeSpit` (гравця) в найближчого видимого ворога, шкода `1 + бонус «Урону»`.
- «Я КОЛЯ»: у `hurtPlayer` після броні — якщо `canSplit`: замість втрати життя 2 с невразливості (`showShield`) і 2 мінікопії (`Familiar` зі `slimeKolya`, scale 0,5) на 4 с.
- **[рішення плану]** §0 обіцяє +50% Шагів, якщо всі трофеї боса вже взяті, але в коді цього досі не було. Робимо це для всіх трьох босів.

- [ ] **Step 1:** тести: `activeForm(['form','iamkolya']) === 'iamkolya'`, `formSkin(...) === 'slimeKolya'`; `canSplit` після `useSplit` на тому ж рівні — false, на наступному — true; `lootStepsBonus(120, []) === 60`, `lootStepsBonus(120, ['loot:larva']) === 0`.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** Playwright `?cards=loot:larva,loot:iamkolya`: без помилок, личинка стріляє.
- [ ] **Step 4:** commit.

### Task 9: Довідник, бот-плейтест, документи, PR

**Files:**
- Modify: `src/systems/Codex.js`, `tests/codex.test.js`, `scripts/playtest.mjs` (`--bamboo`, `--kolya`, звіт `kolyaKilled`), `docs/superpowers/specs/...` (§9.5 «Як зроблено»), `CLAUDE.md` («Стан», «Де що»)

- [ ] **Step 1:** записи: ніндзя, ліхтарик, кусака, личинка-стрілець, сюрикен, слиз, кілок; бос Коля; біом «Туманний бамбук»; трофеї; скін не потрібен (трансформація — в трофеях). `BIOMES.bamboo`, сортування за біомом: печера → зима → бамбук. Тест: 3 боси.
- [ ] **Step 2:** `npm test`, `npm run build` — PASS.
- [ ] **Step 3:** бот-плейтест `--kolya --weapon axe --seconds 200`, `--bamboo --seconds 120`, звичайний `--seconds 220 --runs 2` (регресія): без `ERRORS`.
- [ ] **Step 4:** документи, commit, push, PR, CI APK, злиття.
