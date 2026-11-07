# Slime Climb MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Робоча Android-гра «Slime Climb» до бою з босом-павуком включно, з одним біомом і графікою-заглушками.

**Architecture:** Phaser-сцени (Boot/Menu/Game/Hud/LevelUp/GameOver) + сутності в `src/entities/` + чиста логіка без Phaser у `src/systems/`, яку покривають тести Vitest. Усі числа балансу живуть в `src/config/balance.js`. Світ «їде» вниз, гравець тримається на ~70 % висоти екрана.

**Tech Stack:** Phaser ^4.2 (arcade physics), Vite ^8, Vitest ^5, Playwright (лише smoke-скрипт), Capacitor ^8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`), Node 22.

**Spec:** `docs/superpowers/specs/2026-11-07-slime-climb-mvp-design.md`

## Global Constraints

- JavaScript ES-модулі, без TypeScript. Без інших рантайм-залежностей, крім Phaser і Capacitor.
- Портрет, базова роздільність 720×1280, `Phaser.Scale.FIT`, `autoCenter: CENTER_BOTH`.
- Жодних «магічних чисел» у сценах/сутностях — тільки `BALANCE.*` з `src/config/balance.js`.
- `src/systems/*` не імпортують Phaser (перевіряється тестом у Task 2).
- Графіка — тільки текстури, згенеровані в `BootScene` через `Graphics.generateTexture`; жодних файлів-зображень.
- Phaser 4 — свіжа мажорна версія; якщо API розходиться з пам'яттю, звіряйся з https://docs.phaser.io перед тим, як писати код.
- Git: кожна задача — гілка `feat/<NN>-<slug>` від актуального `main`, PR у `main`; користувач зливає. Теги: `v0.0.1` після Task 4, `v0.1` після Task 10. Коміти закінчуються рядками атрибуції сесії.
- Після кожної задачі: `npm test` і `npm run build` зелені; для задач зі сценами ще `npm run smoke` без помилок консолі.

## Review Focus

1. **Застосунок згорнули / вкладку сховали** → гра на паузі, після повернення об'єкти не стрибають (delta ≤ 50 мс). Тест: Task 3 (`clampDelta`), ручна перевірка в Task 3.
2. **Кілька рівнів за раз** (бос дає багато досвіду) → вибір картки показується послідовно для кожного рівня, жоден не губиться. Тест: Task 8 (`addXp` повертає `levelsGained: 3`).
3. **Тап під час вікна LevelUp** не спричиняє стрибок після закриття вікна. Перевірка: Task 8, крок ручної перевірки.
4. **Два джерела шкоди в одному кадрі** (шип + кажан) → знімається лише одне життя. Тест: Task 5 (`applyDamage` двічі з тим самим `nowMs`).
5. **localStorage недоступний або містить сміття** → рекорд = 0, гра не падає. Тест: Task 5 (`loadHighScore` з кидаючим сховищем і з `"abc"`).

---

### Task 1: Каркас проєкту і smoke-перевірка

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `src/main.js`, `src/scenes/BootScene.js`, `src/scenes/GameScene.js`, `scripts/smoke.mjs`, `tests/sanity.test.js`, `README.md`

**Interfaces:**
- Produces: npm-скрипти `dev`, `build`, `test` (`vitest run`), `smoke`; ключі сцен `'Boot'`, `'Game'`; текстури `'slime'` (48×48 зелений квадрат з двома білими очима), `'wall'`, `'spike'`, `'projectile'`, `'lion'`, `'bat'`, `'plant'`, `'plantBullet'`, `'spider'`, `'smallSpider'`, `'shadow'`, `'heart'` — усі генерує `BootScene`.

- [ ] **Step 1:** `npm create`-подібний каркас вручну: `package.json` з `"type": "module"`, залежності `phaser@^4.2`, dev: `vite@^8`, `vitest@^5`, `playwright`. `vite.config.js` з `base: './'` (потрібно для Capacitor).
- [ ] **Step 2:** Тест `tests/sanity.test.js`: `expect(1 + 1).toBe(2)`. Run: `npm test` → PASS.
- [ ] **Step 3:** `src/main.js` — `new Phaser.Game({ type: AUTO, width: 720, height: 1280, backgroundColor: '#1b2a1b', physics: { default: 'arcade' }, scale: {...}, scene: [BootScene, GameScene] })`. `BootScene.create()` генерує всі текстури зі списку вище і стартує `'Game'`. `GameScene` поки малює `'slime'` по центру.
- [ ] **Step 4:** `scripts/smoke.mjs`: запускає `vite preview` на вільному порту, відкриває сторінку в headless Chromium (viewport 360×640), чекає 4 с, збирає `console` errors і `pageerror`, зберігає `smoke.png`, виходить з кодом 1, якщо помилки є. `smoke.png` у `.gitignore`.
- [ ] **Step 5:** Run: `npm run build && npm run smoke` → exit 0, на скріншоті зелений квадрат з очима.
- [ ] **Step 6:** README: як запустити (`npm i`, `npm run dev`), структура папок. Commit `chore: project scaffold`.

### Task 2: Баланс, складність, очки

**Files:**
- Create: `src/config/balance.js`, `src/systems/Difficulty.js`, `src/systems/Score.js`
- Test: `tests/difficulty.test.js`, `tests/score.test.js`, `tests/purity.test.js`

**Interfaces:**
- Produces:
  - `BALANCE` (frozen object) з ключами, мінімум: `scrollBase: 120`, `scrollGrowth: 1.5` (px/s за секунду), `maxScrollSpeed: 520`, `bossScrollFactor: 0.3`, `pxPerPoint: 10`, `jumpDurationMs: 380`, `playerYRatio: 0.7`, `wallWidth: 60`, `maxLives: 2`, `invulnerableMs: 5000`, `fireIntervalMs: 1000`, `minFireIntervalMs: 250`, `projectileDamage: 1`, `projectileSpeed: 520`, `enemies: { lion: {hp:4, xp:5, points:50, from:10, speed:90, lungeSpeed:420}, bat: {hp:1, xp:2, points:20, from:30, speed:260}, plant: {hp:2, xp:3, points:30, from:45, fireMs:2500, bulletSpeed:220}, smallSpider: {hp:1, xp:1, points:10, speed:150} }`, `boss: { atSec:120, hp:30, telegraphMs:1000, spawnMs:4000, spawnCount:[2,3], xp:60, points:1000 }`, `xpBase: 10`, `xpGrowth: 1.4`, `spawnBaseMs: { lion:6000, bat:4000, plant:9000 }`, `spawnMinFactor: 0.4`, `spikeHeight: 40`, `playerSize: 48`, `cards: { attackSpeedFactor: 0.85, slowFactor: 0.6, slowBaseMs: 2000, slowStepMs: 1000 }`, `maxDeltaMs: 50`.
  - `scrollSpeed(tSec: number, bossActive: boolean) => number` — `min(scrollBase + scrollGrowth*tSec, maxScrollSpeed)`, помножене на `bossScrollFactor`, якщо `bossActive`.
  - `spawnIntervalMs(type: 'lion'|'bat'|'plant', tSec: number) => number` — лінійно від `spawnBaseMs[type]` до `spawnBaseMs[type]*spawnMinFactor` за 0…180 с, далі константа.
  - `heightPoints(distancePx: number) => number` — `Math.floor(distancePx / pxPerPoint)`.
  - `killPoints(type: string) => number` — з `BALANCE.enemies[type].points` або `BALANCE.boss.points` для `'boss'`.

- [ ] **Step 1: Тести.** `scrollSpeed(0,false) === 120`; `scrollSpeed(100,false) === 270`; `scrollSpeed(10000,false) === 520`; `scrollSpeed(100,true) === 81`. `spawnIntervalMs('bat',0) === 4000`; `spawnIntervalMs('bat',180) === 1600`; `spawnIntervalMs('bat',999) === 1600`. `heightPoints(95) === 9`. `killPoints('lion') === 50`, `killPoints('boss') === 1000`. `purity.test.js`: читає всі файли `src/systems/*.js` як текст і перевіряє відсутність `from 'phaser'`.
- [ ] **Step 2:** Run `npm test` → FAIL (модулів нема).
- [ ] **Step 3:** Реалізувати три файли за інтерфейсами.
- [ ] **Step 4:** Run `npm test` → PASS. Commit `feat: balance, difficulty and score systems`.

### Task 3: Рух — стіни, стрибок, прокрутка, пауза

**Files:**
- Create: `src/entities/Player.js`, `src/systems/Time.js`
- Modify: `src/scenes/GameScene.js`
- Test: `tests/time.test.js`

**Interfaces:**
- Consumes: `BALANCE`, `scrollSpeed`.
- Produces:
  - `clampDelta(deltaMs: number) => number` — `min(max(deltaMs,0), BALANCE.maxDeltaMs)`.
  - `class Player extends Phaser.Physics.Arcade.Sprite` з `side: 'left'|'right'`, `isJumping: boolean`, `jump(): void` (ігнорується, якщо `isJumping`), подія `'landed'`.
  - `GameScene` поля: `elapsedSec`, `distancePx`, `currentScroll`, групи `walls`, `hazards`, `enemies`, `playerProjectiles`, `enemyProjectiles`; метод `scrollObjects(dy: number)` зсуває всі групи вниз і знищує те, що нижче `height + 100`.
  - Глобальна пауза: `GameScene.setPaused(paused: boolean)` — ставить/знімає паузу фізики й таймерів.

- [ ] **Step 1: Тест** `clampDelta(16) === 16`, `clampDelta(5000) === 50`, `clampDelta(-3) === 0`. Run → FAIL. Реалізувати. Run → PASS.
- [ ] **Step 2:** `Player`: стоїть на внутрішньому краї лівої стіни на `y = height*playerYRatio`. `jump()` — tween по x до протилежної стіни за `jumpDurationMs` з дугою по y (вгору на 80 px і назад), по завершенні `side` міняється, `isJumping=false`, emit `'landed'`.
- [ ] **Step 3:** `GameScene.update(time, delta)`: `dt = clampDelta(delta)`, `elapsedSec += dt/1000`, `currentScroll = scrollSpeed(elapsedSec, bossActive)`, `distancePx += currentScroll*dt/1000`, `scrollObjects(currentScroll*dt/1000)`. Стіни — тайлові спрайти `'wall'` з прокруткою `tilePositionY`. `pointerdown` будь-де → `player.jump()`.
- [ ] **Step 4:** `document.visibilitychange` (hidden) → `setPaused(true)`; повернення → `setPaused(false)` після тапу «Продовжити» (простий текст по центру).
- [ ] **Step 5:** Run `npm run build && npm run smoke` → без помилок. Ручна перевірка в `npm run dev`: тап — стрибок між стінами, другий тап у польоті ігнорується; сховати вкладку на 10 с і повернутись — пауза, без ривка.
- [ ] **Step 6:** Commit `feat: wall jumping and world scrolling`.

### Task 4: Ранній APK через Capacitor

**Files:**
- Create: `capacitor.config.json`, `android/` (генерується), `docs/android-build.md`
- Modify: `package.json` (скрипт `android:sync` = `npm run build && npx cap sync android`), `src/main.js`

**Interfaces:**
- Produces: `appId: "com.zychkov.slimeclimb"`, `appName: "Slime Climb"`, `webDir: "dist"`; портретна орієнтація в `AndroidManifest.xml` (`android:screenOrientation="portrait"`).

- [ ] **Step 1:** Встановити `@capacitor/core@^8`, `@capacitor/cli@^8`, `@capacitor/android@^8`, `@capacitor/app@^8`; `npx cap init` з параметрами вище; `npx cap add android`.
- [ ] **Step 2:** У `main.js`: якщо доступний `@capacitor/app`, `App.addListener('pause', ...)` → `GameScene.setPaused(true)`; `'resume'` → показати «Продовжити».
- [ ] **Step 3:** Run `npm run android:sync` → без помилок (у хмарі без Android SDK збірку gradle не запускаємо).
- [ ] **Step 4:** `docs/android-build.md` українською: встановити Android Studio, Node 22; `npm i`, `npm run android:sync`, `npx cap open android`, Build → Build APK(s), встановити на телефон (увімкнути «Встановлення з невідомих джерел»). Що перевірити: плавність стрибка, відгук тапу, fps. Для fps додати в `main.js` режим `?debug=1`, який виводить `game.loop.actualFps` у кутку екрана (на Android: параметр через `server.url` не потрібен — debug вмикається константою `DEBUG` у `main.js` на час перевірки).
- [ ] **Step 5:** Commit `feat: capacitor android wrapper`. Після злиття — тег `v0.0.1`. **Зупинка:** чекаємо відгук користувача з телефону перед Task 5.

### Task 5: Шипи, життя, HUD, GameOver, рекорд

**Files:**
- Create: `src/systems/Health.js`, `src/systems/SpikePlanner.js`, `src/systems/HighScore.js`, `src/entities/Spike.js`, `src/scenes/HudScene.js`, `src/scenes/GameOverScene.js`
- Modify: `src/scenes/GameScene.js`, `src/main.js`
- Test: `tests/health.test.js`, `tests/spikes.test.js`, `tests/highscore.test.js`

**Interfaces:**
- Produces:
  - `createHealth(maxLives = BALANCE.maxLives) => { lives, invulnerableUntil }`
  - `applyDamage(h, nowMs) => { health, tookDamage: boolean, died: boolean }` — під час `nowMs < invulnerableUntil` нічого не змінює; інакше `lives-1`, `invulnerableUntil = nowMs + invulnerableMs`.
  - `minSpikeGap(scrollPxPerSec) => number` — `scrollPxPerSec * jumpDurationMs/1000 + playerSize + spikeHeight`.
  - `nextSpikeGap(scrollPxPerSec, rng: () => number) => number` — `minSpikeGap * (1 + rng())` (тобто 1×…2× мінімуму).
  - `loadHighScore(storage) => number`, `saveHighScore(storage, score) => number` (повертає новий найкращий). Обидві ловлять винятки; нечислове значення → 0.
  - Події `GameScene` для HUD: `'hud:update'` з `{ timeSec, score, lives, level, xp, xpToNext }`.
- [ ] **Step 1: Тести.** Health: після першого удару `lives===1, died===false`; другий удар з тим самим `nowMs` → `tookDamage===false`; удар на `nowMs+5001` → `died===true`. Spikes: `minSpikeGap(120) === 120*0.38+48+40` (=133.6); `nextSpikeGap(120, ()=>0) === minSpikeGap(120)`; `nextSpikeGap(120, ()=>0.999) < 2*minSpikeGap(120)`. HighScore: фейкове сховище; `saveHighScore(s, 50)` → 50, далі `saveHighScore(s, 30)` → 50; сховище, чиї методи кидають, → `loadHighScore === 0`, `saveHighScore` не кидає; значення `"abc"` → 0.
- [ ] **Step 2:** Run → FAIL. Реалізувати системи. Run → PASS.
- [ ] **Step 3:** `Spike` — трикутник на внутрішньому краї стіни, вістрям у прохід. Генерація: для кожної стіни окремо тримати `nextSpikeY`, ставити новий шип за `nextSpikeGap(currentScroll, Math.random)` над попереднім, спавн за верхнім краєм екрана. Перший шип не раніше 3 с гри.
- [ ] **Step 4:** Overlap гравця з `hazards`/`enemies`/`enemyProjectiles` → `applyDamage(health, time)`; при `tookDamage` гравець блимає (alpha-tween) до `invulnerableUntil`; при `died` → `scene.start('GameOver', { score, timeSec })`.
- [ ] **Step 5:** `HudScene` паралельно з Game: справа вгорі `mm:ss` і `SCORE n`, зліва серця, під ними шкала досвіду і `LV n`. Score = `heightPoints(distancePx) + сума killPoints`. `GameOverScene`: score, рекорд (`saveHighScore(localStorage, score)`), «Тапни, щоб грати ще».
- [ ] **Step 6:** Smoke + ручна перевірка: два удари шипом → GameOver; між ударами 5 с невразливості; рекорд переживає перезавантаження сторінки. Commit `feat: spikes, lives, hud and game over`.

### Task 6: Автострільба і лев

**Files:**
- Create: `src/systems/Targeting.js`, `src/entities/Projectile.js`, `src/entities/Enemy.js`, `src/entities/Lion.js`
- Modify: `src/scenes/GameScene.js`
- Test: `tests/targeting.test.js`

**Interfaces:**
- Produces:
  - `pickNearest(from: {x,y}, targets: Array<{x,y,active:boolean}>) => target | null` — ігнорує `active===false`; при рівній відстані — перший у масиві.
  - `class Enemy extends Phaser.Physics.Arcade.Sprite`: `constructor(scene, x, y, texture, type)`, поля `type`, `hp`, `slowUntil`, `slowFactor`; `takeHit(damage, slow?: {factor, durationMs}, nowMs)`; при `hp<=0` emit сцені `'enemy:killed'` з `{ type, x, y }` і `destroy()`. Метод `speedMul(nowMs)` повертає `slowFactor` або 1.
  - `class Projectile` — летить по прямій у точку цілі на момент пострілу зі швидкістю `projectileSpeed`, знищується за межами екрана; несе `damage` і `slow`.
  - `GameScene.weapon = { fireIntervalMs, damage, slow: null | {factor, durationMs} }` — змінюється картками в Task 8.
  - `class Lion extends Enemy` — спавниться на одній зі стін внизу екрана, біжить вгору `speed*speedMul`, коли `y <= height/2`, один раз робить ривок у поточну позицію гравця зі швидкістю `lungeSpeed`, потім продовжує лінію ривку й знищується за екраном.
- [ ] **Step 1: Тести** `pickNearest`: порожній масив → null; ціль з `active:false` ігнорується; з трьох обирається найближча; рівні відстані → перша.
- [ ] **Step 2:** Run → FAIL. Реалізувати. Run → PASS.
- [ ] **Step 3:** Таймер у `GameScene` кожні `weapon.fireIntervalMs`: якщо `pickNearest(player, enemies на екрані)` не null — постріл. Без ворогів не стріляє. Overlap `playerProjectiles`×`enemies` → `takeHit`, снаряд знищується. `'enemy:killed'` → додати `killPoints`, (досвід — Task 8).
- [ ] **Step 4:** Тимчасовий спавн лева кожні `spawnIntervalMs('lion', t)` з `t >= enemies.lion.from` (у Task 7 переїде в Spawner).
- [ ] **Step 5:** Smoke + ручна перевірка: лев гине з 4 влучань; ривок летить туди, де був гравець; без ворогів пострілів немає. Commit `feat: auto-fire and lion enemy`.

### Task 7: Кажан, рослина, розклад спавну

**Files:**
- Create: `src/systems/Spawner.js`, `src/entities/Bat.js`, `src/entities/Plant.js`, `src/entities/PlantBullet.js`
- Modify: `src/scenes/GameScene.js`
- Test: `tests/spawner.test.js`

**Interfaces:**
- Produces:
  - `createSpawnState() => { nextAt: { lion, bat, plant } }` (секунди гри; стартові = `enemies[type].from`).
  - `dueSpawns(state, tSec, bossActive) => { state, spawn: string[] }` — при `bossActive` повертає `[]` і зсуває `nextAt` так, щоб після боса ворогів не «вивалило» пачкою; інакше для кожного типу з `tSec >= nextAt[type]` додає тип і ставить `nextAt = tSec + spawnIntervalMs(type,tSec)/1000`.
  - `Bat extends Enemy` — летить до поточної позиції гравця зі `speed*speedMul` (переоцінка напрямку кожен кадр).
  - `Plant extends Enemy` — прикріплена до стіни, їде разом зі світом, кожні `fireMs` стріляє `PlantBullet` у гравця; кулі в групі `enemyProjectiles`.
- [ ] **Step 1: Тести** `dueSpawns`: на `t=5` → `[]`; на `t=10` → містить `'lion'`; на `t=30` після попередніх викликів → містить `'bat'`; повторний виклик з тим самим `t` → `[]`; `bossActive=true` на `t=125` → `[]`, і виклик на `t=126` після `bossActive=false` повертає не більше одного спавну кожного типу.
- [ ] **Step 2:** Run → FAIL. Реалізувати. Run → PASS.
- [ ] **Step 3:** Замінити тимчасовий спавн лева з Task 6 на `dueSpawns`. Додати Bat і Plant.
- [ ] **Step 4:** Smoke + ручна перевірка: на 0:30 з'являються кажани, на 0:45 — рослини; кулі рослини знімають життя. Commit `feat: bat, plant and spawn schedule`.

### Task 8: Досвід, рівні, картки

**Files:**
- Create: `src/systems/Progression.js`, `src/scenes/LevelUpScene.js`
- Modify: `src/scenes/GameScene.js`, `src/main.js`
- Test: `tests/progression.test.js`

**Interfaces:**
- Produces:
  - `xpToNext(level: number) => number` — `Math.round(xpBase * xpGrowth^(level-1))`.
  - `createProgression() => { level: 1, xp: 0, weapon: { fireIntervalMs, damage, slow: null }, picks: {} }`.
  - `addXp(p, amount) => { progression, levelsGained: number }` — переносить надлишок між рівнями.
  - `CARD_IDS = ['attackSpeed', 'damage', 'slow']`; `availableCards(p) => string[]` — `attackSpeed` недоступна, коли `fireIntervalMs === minFireIntervalMs`.
  - `rollCards(p, rng, n = 3) => string[]` — різні id з `availableCards`, довжина `min(n, available.length)`.
  - `applyCard(p, id) => progression` — `attackSpeed`: `max(round(fireIntervalMs*0.85), minFireIntervalMs)`; `damage`: `+1`; `slow`: перший раз `{factor: 0.6, durationMs: 2000}`, далі `durationMs += 1000`.
  - `LevelUpScene` отримує `{ cards: string[] }`, після вибору emit у Game `'levelup:picked'` з id.
- [ ] **Step 1: Тести** `xpToNext(1)===10`, `xpToNext(2)===14`, `xpToNext(3)===20`; `addXp(fresh, 9).levelsGained===0`; `addXp(fresh, 10)` → level 2, xp 0; `addXp(fresh, 60).levelsGained===3` (10+14+20=44, залишок 16 < 27); `rollCards` з rng-послідовністю повертає 3 унікальні; при `fireIntervalMs===250` `attackSpeed` не випадає і повертається 2 картки; `applyCard('attackSpeed')` з 1000 → 850; повторне застосування до 260 → 250; `applyCard('slow')` двічі → `durationMs===3000`.
- [ ] **Step 2:** Run → FAIL. Реалізувати. Run → PASS.
- [ ] **Step 3:** `'enemy:killed'` → `addXp(p, xp типу)`; якщо `levelsGained>0` — додати стільки ж записів у чергу; поки черга не порожня — пауза Game (`setPaused(true)`), `scene.launch('LevelUp', { cards: rollCards(...) })`; після `'levelup:picked'` → `applyCard`, оновити `weapon`, наступний запис черги або `setPaused(false)`.
- [ ] **Step 4:** Ігнорувати `pointerdown` для стрибка протягом 200 мс після закриття LevelUp (захист від «протікання» тапу).
- [ ] **Step 5:** Сповільнення: снаряд несе `weapon.slow`, `Enemy.takeHit` ставить `slowUntil`; ворог під сповільненням тоноване синім.
- [ ] **Step 6:** Smoke + ручна перевірка: вбивства заповнюють шкалу; на новому рівні гра на паузі, три картки; швидкий тап по картці не викликає стрибок; «Урон» робить лева вбиваним з 2 пострілів після 3 виборів. Commit `feat: xp, levels and upgrade cards`.

### Task 9: Бос-павук

**Files:**
- Create: `src/entities/SpiderBoss.js`, `src/entities/SmallSpider.js`, `src/systems/BossPlanner.js`
- Modify: `src/scenes/GameScene.js`, `src/scenes/HudScene.js`
- Test: `tests/boss.test.js`

**Interfaces:**
- Produces:
  - `shouldStartBoss(tSec, bossState: 'none'|'active'|'dead') => boolean` — true лише при `tSec >= boss.atSec && bossState === 'none'`.
  - `pickStrikeX(playerX, rng, laneMin, laneMax) => number` — з імовірністю 0.6 точка над гравцем (±40 px), інакше випадкова в межах коридору; результат завжди в `[laneMin, laneMax]`.
  - `SpiderBoss extends Enemy` (`type: 'boss'`): цикл станів `hidden → telegraph (тінь 'shadow' у точці pickStrikeX, telegraphMs) → strike (опускається на павутині до y гравця, дотик = шкода) → retreat`; кожні `boss.spawnMs` спавнить `spawnCount` павучків; HP-смуга в HUD через подію `'hud:boss'` `{ hp, maxHp } | null`.
  - `SmallSpider extends Enemy` — повзе до гравця зі `speed`.
- [ ] **Step 1: Тести** `shouldStartBoss(119,'none')===false`, `(120,'none')===true`, `(130,'active')===false`, `(200,'dead')===false`. `pickStrikeX` з rng→0 повертає значення в межах `playerX±40` і в межах коридору; з `playerX` біля краю — результат не виходить за `laneMin/laneMax`.
- [ ] **Step 2:** Run → FAIL. Реалізувати. Run → PASS.
- [ ] **Step 3:** Інтеграція: при старті боса `bossActive=true` (впливає на `scrollSpeed` і `dueSpawns`); `'enemy:killed'` з `type:'boss'` → `bossState='dead'`, `bossActive=false`, досвід `boss.xp`, очки `boss.points`, `'hud:boss'` з `null`; живі павучки лишаються.
- [ ] **Step 4:** Тимчасовий параметр `?boss=1` у URL стартує боса на 5-й секунді (для перевірки; документується в README).
- [ ] **Step 5:** Smoke з `?boss=1` + ручна перевірка: тінь видно ~1 с перед ударом, від удару можна відскочити; павучки гинуть з одного пострілу; після смерті боса швидкість і спавн відновлюються, черга рівнів відпрацьовує. Commit `feat: spider boss`.

### Task 10: Меню, фінальна перевірка, v0.1

**Files:**
- Create: `src/scenes/MenuScene.js`
- Modify: `src/main.js`, `src/scenes/BootScene.js`, `src/scenes/GameOverScene.js`, `README.md`

**Interfaces:**
- Consumes: `loadHighScore`.
- Produces: потік `Boot → Menu → Game(+Hud) → GameOver → Game`.
- [ ] **Step 1:** `MenuScene`: назва «Slime Climb», рекорд, «Тапни, щоб почати». Boot стартує Menu, а не Game.
- [ ] **Step 2:** Прохід по специфікації (розділи 4.1–4.9, 5) з чек-листом у PR-описі: кожен пункт — «є/немає/де».
- [ ] **Step 3:** Run `npm test && npm run build && npm run smoke` → все зелене. `npm run android:sync` → без помилок.
- [ ] **Step 4:** README: як грати, debug-параметри `?debug=1`, `?boss=1`, де змінювати баланс.
- [ ] **Step 5:** Commit `feat: menu and mvp polish`. Фінальне рев'ю всієї гілки. Після злиття — тег `v0.1`; користувач збирає APK і перевіряє на телефоні за `docs/android-build.md`.
