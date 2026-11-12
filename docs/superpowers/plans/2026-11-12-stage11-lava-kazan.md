# Етап 11: «Лавові надра», «Пан Казан», фідбек-5 — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** четвертий біом у колі (лава: саламандра, іскра, лавова крапля, іскри на фоні), бос «Пан Казан» з 4 фазами й трофеями, нові HP босів і контур посилених ворогів замість зірочки.

**Architecture:** як в етапі 9. Числа — у `src/config/balance.js` (блоки `lava`, `kazan`, `kazanLoot`, вороги в `enemies`, `traits`). Логіка без Phaser — `src/systems/Lava.js`, `KazanPlanner.js`, `KazanLoot.js`, доповнення `Cycle.js`, `Spawner.js`, `Difficulty.js`, `Tuning.js`, `Settings.js`, `ShkodkoLoot.js` (`FORM_IDS`). Сутності — `src/entities/*`, арт — по файлу на спрайт у `src/art/sprites`.

**Tech Stack:** Phaser 4, Vite, Vitest, Playwright (бот-плейтест), Capacitor 8.

**Spec:** `docs/superpowers/specs/2026-11-07-slime-climb-v2-design.md`, §11 (основа — §8, §9, §10).

## Global Constraints

- Без чужих персонажів, логотипів і музики. Пан Казан — власний чавунний казан на ніжках, кришка-капелюх, вуса з пари.
- Музика й звук — кодом (`Music.js` / `Audio.js`), графіка — піксель-арт кодом, з PNG-заміною.
- Усі числа — в `balance.js`; логіка в `systems/*` без Phaser, з тестами.
- Інваріант «безпечна стіна»: на обох стінах одночасно перешкод немає (шипи, крапля, лава й калюжа Казана, ніндзя/саламандра-резерв).
- Коло: печера → зима → бамбук → лава → печера, `loop + 1` лише після Казана; `biomeIndex = loop × 4 + біом`.
- HP: павучиха 55, Шкодько 130, Коля 175, Казан 230, ведмідь 120. «Важко»: `shkodko 1.2`, `kolya 1.3`, `kazan 1.3`.
- Казан: нагорода 150 Шагів, досвід 120, досягнення 250/600; біом — 50 саламандр, 50 іскор.
- Новий ворог/трофей/скін у `balance.js` — запис у `Codex.js`.

## Review Focus

1. Удар, що за раз перескакує 70% або 35% (сокира, бомби, кільце «Я КАЗАН»): кипіння й лють не пропускаються — HP тримається на порозі (`kazanHpFloor`), як у Колі.
2. Казан гине посеред виливання, польоту кришки чи з калюжею на стіні: усе зникає (`clearBossAttacks`), стіна звільняється в `SpikePlanner`, кришка не повертається.
3. Коло 1+: калюжа після виливання ніколи не лишає обидві стіни зайнятими, навіть у люті з вікном 0,9 с.
4. Саламандру вбито під час лінії-попередження — струменя немає; гравець приземлився за 0,3 с до струменя — струмінь чекає.
5. Старі збереження без `kazan` у «Складності» і без `embers` у налаштуваннях: множник 1, іскри увімкнені; рекорди й досягнення не губляться.

---

### Task 1: Фідбек-5 — HP босів, «Складність», контур

**Files:**
- Modify: `src/config/balance.js` (`shkodko.hp 130`, `kolya.hp 175`, `traits.outline`), `src/systems/Tuning.js`, `src/entities/Enemy.js`, `src/art/sprites/index.js`
- Delete: `src/art/sprites/traitStar.js`
- Test: `tests/tuning.test.js`, `tests/kolya.test.js`, `tests/shkodko.test.js`

**Interfaces:**
- Produces: поле `TUNING_FIELDS` `{ key: 'kazan', label: 'HP Казана', min: 0.5, max: 4, step: 0.1 }`; `defaultTuning().kazan === 1`; `PRESETS.hard.values` з `shkodko: 1.2, kolya: 1.3, kazan: 1.3`; `BALANCE.traits.outline = { color, lavaColor, pulseMs, width }`. `Enemy` малює контур (`preFX`/копія спрайта з tint і більшим масштабом — що працює в Phaser 4) замість `this.star`; поле `this.outline`.

- [ ] **Step 1:** тести: `normalizeTuning({})`.kazan === 1; `normalizeTuning({ kazan: 9 }).kazan === 4`; hard-набір має `kazan`. `splitHp(175 × 0.4)` дає 3 частини з сумою 70; `eatHeal` лікує до 15% від 175. Існуючі тести з 85/110 переписати.
- [ ] **Step 2:** `npx vitest run tests/tuning.test.js tests/kolya.test.js tests/shkodko.test.js` — FAIL.
- [ ] **Step 3:** реалізація; `bossHpTuning('kazan')` читає нове поле. Контур: колір `lavaColor`, коли біом `lava`.
- [ ] **Step 4:** `npm test` — PASS; `npm run build` — OK.
- [ ] **Step 5:** commit «Етап 11: HP босів, поле Казана, контур замість зірочки».

### Task 2: Баланс і коло з чотирьох біомів

**Files:**
- Modify: `src/config/balance.js`, `src/systems/Cycle.js`, `src/systems/Spawner.js`, `src/systems/Difficulty.js`
- Test: `tests/cycle.test.js`, `tests/spawner.test.js`, `tests/difficulty.test.js`

**Interfaces:**
- Produces: `BALANCE.lava { from, spawnBaseMs, bat, drop, embers, transitionMs }`, `BALANCE.kazan { name: 'Пан Казан', hp: 230, afterSec: 180, debugAtSec: 6, steps: 150, xp: 120, … }`, `BALANCE.kazanLoot`, `BALANCE.enemies.{salamander, spark, sparkling, bubble}`, `traits.{salamander: { breaths: 2, gapMs: 500 }, spark: { splits: 3 }}`; `firstSegment('lava' | 'kazan')`; `nextSegment` після `kolya` → `{ biome: 'lava', boss: 'kazan', atSec: kill + 180, loop, startSec: kill }`, після `kazan` → печера `loop + 1`; `BIOME_ORDER.lava = 3`, `biomeIndex = loop × 4 + order`; `BIOME_TYPES.lava = ['salamander', 'spark', 'bat']`.

- [ ] **Step 1:** тести. `nextSegment(kolyaSeg, 700)` → лава/kazan, `atSec 880`, loop 0; `nextSegment(kazanSeg, 900)` → печера, loop 1. `biomeIndex({ loop: 1, biome: 'cave' }) === 4`, `({ loop: 0, biome: 'lava' }) === 3`. Бази лави = `round(bamboo × 0.9)` (salamander ← ninja, spark ← lantern, bat ← bat). Тест «після Колі — печера» переписати.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** реалізація; `from { spark: 3, bat: 8, salamander: 10 }`; кажан у лаві `{ hp: 2, speedMul: 1.15 }`.
- [ ] **Step 4:** `npm test` — PASS.
- [ ] **Step 5:** commit «Етап 11: баланс і коло з чотирьох біомів».

### Task 3: Логіка лави (без Phaser)

**Files:**
- Create: `src/systems/Lava.js`
- Modify: `src/systems/SpikePlanner.js` (лише якщо `reserveFree` треба для краплі — перевикористати)
- Test: `tests/lava.test.js`

**Interfaces:**
- Produces: `salamanderTimeline(enhanced) → { emergeMs: 600, warnMs: 700, breathMs: 400, breaths, gapMs, hideMs }`; `beamCanFire(sinceLandMs) → boolean` (≥ 300); `beamHits(player, beamY, halfH) → boolean` (гравець у повітрі на іншій висоті — ні); `sparkSplit(enhanced, aliveSmall) → number` (2 або 3, не більше `6 − aliveSmall`); `dropPlan(state, side, nowMs) → { state, ok }` — крапля можлива лише якщо інша стіна вільна (через `reserveFree`); `dropsAllowed(bossActive) → boolean`.

- [ ] **Step 1:** тести: `beamCanFire(299) === false`, `(300) === true`; `sparkSplit(false, 5) === 1`, `(true, 0) === 3`, `(false, 6) === 0`; крапля на лівій, коли права зайнята шипом у тому ж інтервалі — `ok: false`; `dropsAllowed(true) === false`; саламандра, вбита до кінця `warnMs`, не дає струменя (`salamanderFires(killedAtMs, timeline)`).
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS.
- [ ] **Step 5:** commit «Етап 11: логіка лави».

### Task 4: Арт лави, Казана й трофеїв

**Files:**
- Create: `src/art/sprites/{wallLava,basalt,salamander,beam,spark,sparkling,lavaDrop,kazan,lid,magma,bubble,puddle,ladle,slimeKazan}.js`, `src/art/backgrounds/lavaEmbers.js`, `src/art/sprites/ember.js`
- Modify: `src/art/palette.js`, `src/art/sprites/index.js`, `src/art/backgrounds/index.js`, `src/art/README.md`
- Test: `tests/art.test.js`

**Interfaces:**
- Produces: `wallLava` (60×64), `basalt` (40×40), `bgLava`, `ember`; `salamander` (`emerge`, `idle`, `breathe`), `beam`, `spark`, `sparkling`, `lavaDrop` (`swell1/swell2`, `run`), `kazan` (112×96: `sway1/sway2`, `tilt`, `boil`, `shake`), `lid`, `magma`, `bubble`, `puddle`, `ladle`, `slimeKazan` (48×48, `idle1/idle2/jump`).

- [ ] **Step 1:** сітки; `npx vitest run tests/art.test.js` — PASS.
- [ ] **Step 2:** commit «Етап 11: арт лави і Казана».

### Task 5: Біом лава в сцені

**Files:**
- Create: `src/entities/{Salamander,Spark,LavaDrop,Embers}.js`
- Modify: `src/scenes/GameScene.js`, `src/scenes/MenuScene.js`, `src/systems/Settings.js`, `src/systems/Codex.js` (тимчасові записи, повні — Task 9)
- Test: `tests/settings.test.js`, `tests/spawner.test.js`

**Interfaces:**
- Consumes: Task 2 (`BIOME_TYPES.lava`, `BALANCE.lava`), Task 3 (`Lava.js`), Task 4 (текстури).
- Produces: `defaultSettings().embers === true`; кнопка меню «Іскри: увімк./вимк.»; `?lava=1` → `firstSegment('lava')`; саламандра резервує стіну як ніндзя (`ninjaInterval` / `reserveFree`), не більше 1 на екрані; дрібні іскри ≤ 6.

- [ ] **Step 1:** тест: `loadSettings` зі старим JSON без `embers` → `true`, `snow` і `fog` збережені.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** ручна перевірка в Playwright `?lava=1`: скриншот, саламандра й крапля ніколи не займають обидві стіни (лог у консоль), іскри під ворогами (depth між −3 і −1).
- [ ] **Step 4:** commit «Етап 11: біом лава».

### Task 6: Логіка Казана (без Phaser)

**Files:**
- Create: `src/systems/KazanPlanner.js`
- Test: `tests/kazan.test.js`

**Interfaces:**
- Produces: `kazanPhase(hpFrac, { boiled, raged }) → 'p1' | 'boil' | 'p2' | 'rage-start' | 'rage'`; `kazanHpFloor(maxHp, { boiled, raged }) → number` (0,7 / 0,35 від maxHp, поки подію не відіграно); `pourSchedule(phase, lastSide, nowMs) → { side, warnAtMs, pourFromMs, pourToMs }` (лють: стіни чергуються, між кінцем однієї й початком іншої `rageGapMs: 900`); `wallsBusy(pours, puddles, nowMs) → { left, right }` — ніколи обидві `true`, калюжа (`puddleMs: 2000`, коло ≥ 1) скорочує чи відсуває наступне виливання; `lidPath(t, startX, endX, y, flightMs) → { x, y, returning }`; `fanAngles` перевикористати з `KolyaPlanner`.

- [ ] **Step 1:** тести: удар з 100% до 20% за раз → HP = 70% і `boil`; з 72% до 30% після кипіння → 35% і `rage-start`; 1000 випадкових кроків `pourSchedule` + `wallsBusy` у люті з калюжами (коло 1) — ніколи обидві стіни; між виливаннями в люті ≥ 900 мс обидві вільні; `lidPath` на половині польоту в `endX`, на кінці — назад у `startX`.
- [ ] **Step 2:** FAIL. **Step 3:** реалізація. **Step 4:** PASS.
- [ ] **Step 5:** commit «Етап 11: логіка Казана».

### Task 7: Пан Казан у сцені, представлення

**Files:**
- Create: `src/entities/{KazanBoss,KazanLid,MagmaDrop,Bubble,LavaPour,Puddle}.js`
- Modify: `src/scenes/GameScene.js` (`BOSSES.kazan`, `clearBossAttacks` — прапорець `kazanMinion`, звільнення стін), `src/systems/BossIntro.js`, `src/systems/Music.js`
- Test: `tests/bossIntro.test.js`, `tests/music.test.js`

**Interfaces:**
- Consumes: Task 6, Task 4, Task 2 (`bossHp(230, loop, 'kazan')`).
- Produces: `bossIntroInfo('kazan', loop)`; мелодія `kazan` (~2 с); `?kazan=1` → `firstSegment('kazan')`; на смерті — подія `enemy:killed` з `type: 'kazan'` рівно один раз.

- [ ] **Step 1:** тести: `INTRO_BOSSES` містить `kazan`; мелодія `kazan` є і триває 1,5–2,5 с.
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** Playwright `?kazan=1`: проходять усі 4 фази (лог), після смерті на екрані немає лави, кришки, калюж, бульбашок.
- [ ] **Step 4:** commit «Етап 11: бос Пан Казан».

### Task 8: Трофеї Казана

**Files:**
- Create: `src/systems/KazanLoot.js`, `src/entities/Ladle.js`
- Modify: `src/systems/ShkodkoLoot.js` (`FORM_IDS` + `'iamkazan'`), `src/systems/CardText.js`, `src/scenes/GameScene.js`
- Test: `tests/kazanLoot.test.js`, `tests/shkodkoLoot.test.js`

**Interfaces:**
- Produces: `KAZAN_LOOT_IDS = ['ladle', 'iamkazan']`; `canBoil(state, level)` / `useBoil(state, level)` (раз за рівень); `ladleDamage(weaponDamage) → 2 + бонус «Урон»`; `ringVictims(player, targets, 120)`; `activeForm` — остання взята з чотирьох; `formSkin` → `slimeKazan`.

- [ ] **Step 1:** тести: другий `useBoil` на тому ж рівні — false, на наступному — true; `activeForm(['iamkolya', 'iamkazan'])` — `iamkazan`; `ringVictims` бере лише ворогів у радіусі 120; `?cards=loot:ladle,loot:iamkazan` (`CardText` має обидва тексти).
- [ ] **Step 2:** FAIL → реалізація → PASS.
- [ ] **Step 3:** commit «Етап 11: трофеї Казана».

### Task 9: Довідник, досягнення, бот, документи, PR

**Files:**
- Modify: `src/systems/Codex.js`, `src/systems/Meta.js` (досягнення), `scripts/playtest.mjs` (`--lava`, `--kazan`), `docs/superpowers/specs/…v2-design.md` (§11.5 «Як зроблено»), `CLAUDE.md` («Стан», «Де що», «Етап 11 — коротко»)
- Test: `tests/codex.test.js`, `tests/meta.test.js`

- [ ] **Step 1:** записи довідника для всіх нових ворогів, боса, бульбашки, трофеїв, біому; досягнення 50 саламандр, 50 іскор, «Вбивство Казана» 250, «5 разів» 600. `npm test` — PASS.
- [ ] **Step 2:** бот: `node scripts/playtest.mjs --seconds 220 --runs 2 --lava` і `--kazan`; записати час бою з Казаном і смерті в §11.5. Повний `--runs 2` без прапорців — нічого не зламалося в печері.
- [ ] **Step 3:** `npm run build` — OK. Commit, push, PR у `main`, дочекатися CI (APK), злити.
