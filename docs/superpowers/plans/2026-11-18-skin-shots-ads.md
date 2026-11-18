# Постріл за скіном, місця реклами, Шаги за перегляд — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Постріл слизака має вигляд за скіном; є слоти банера в паузі й на екрані смерті; у магазині кнопка «Реклама: +50 Шагів» із заглушкою замість SDK.

**Architecture:** Чиста логіка (`systems/Ads.js`, `Layout.adBannerRect`, `Meta.shotSprite`, `Skills.playerShotTexture`) окремо від Phaser; єдина точка реклами — `src/ads/AdService.js` із режимом `AD_MODE` (`'stub' | 'off'`) з `src/config/ads.js`. Реальний SDK пізніше замінює лише AdService.

**Tech Stack:** Phaser 4, Vite, vitest, піксельні спрайти кодом (`src/art/sprites/*.js`).

**Spec:** `docs/superpowers/specs/2026-11-18-skin-shots-ads-design.md`

## Global Constraints
- Усі тексти українською; нагорода `REWARD_STEPS = 50`, кулдаун `REWARD_COOLDOWN_MS = 120000`.
- Шаги тільки в магазині скінів; на екрані смерті й у паузі лише банер.
- Спрайти пострілів 16×16, `cell: 4`, як `projectile` (хітбокс і баланс не змінюються); оригінальні, без чужих персонажів.
- Логіка в `src/systems/*` — без Phaser (тест `purity.test.js`); числа — у `src/config/*`; у нових модулях не називати локальну змінну `s`.
- Після правки `balance.js` — `node --check src/config/balance.js`; `//` не ставити посеред рядка перед `}`.
- Перевірки: `npm test`, `npm run build`. Тести в хмарі: `npm ci` на Linux (не `node_modules` користувача).

## Review Focus
- `meta.adAt` у майбутньому чи від'ємний/нечисловий → кулдаун не блокує назавжди (тест у Task 2).
- `AD_MODE = 'off'` → ні банера, ні кнопки (Task 3, Task 4).
- Дострокове закриття ролика → нагороди немає (Task 3).
- Перебудова екрана (resize) під час ролика/банера → банер не дублюється, нагорода не подвоюється (Task 4).
- Скін + трофей «Павутина» → `webShot`, а не скінова текстура (Task 1).

---

### Task 1: Постріл за скіном

**Files:**
- Create: `src/art/sprites/shotAssassin.js`, `shotCommander.js`, `shotRaccoon.js`, `shotMurzik.js`
- Modify: `src/art/sprites/index.js` (імпорти + `SPRITES`), `src/config/balance.js` (`meta.skins[].shot`), `src/systems/Meta.js`, `src/systems/Skills.js`, `src/game/Combat.js:115`
- Test: `tests/meta.test.js`, `tests/skills.test.js` (створити, якщо нема)

**Interfaces:**
- Produces: `shotSprite(meta: Meta): string` у `Meta.js`; `playerShotTexture(shot: string, relics: string[]): string` у `Skills.js`; поле `shot` у кожного скіна (`slime` → `'projectile'`).

- [ ] **Step 1: Failing tests.** `meta.test.js`: `every skin has a shot sprite registered in SPRITES` (для кожного `BALANCE.meta.skins` `SPRITES.some(sp => sp.key === skin.shot)`); `shotSprite(emptyMeta()) === 'projectile'`; `shotSprite({...emptyMeta(), owned:['slime','murzik'], skin:'murzik'}) === 'shotMurzik'`. `skills.test.js`: `playerShotTexture('shotMurzik', []) === 'shotMurzik'`; `playerShotTexture('shotMurzik', ['web']) === 'webShot'`; `playerShotTexture('projectile', ['venom']) === 'projectile'`.
- [ ] **Step 2: Run** `npx vitest run tests/meta.test.js tests/skills.test.js` → FAIL (нема `shot`, `shotSprite`).
- [ ] **Step 3: Спрайти** за форматом `projectile.js` (`key`, `w:16`, `h:16`, `cell:4`, `palette`, `frames.shot` 4×4): `shotAssassin` темно-фіолетова зірочка; `shotCommander` золотий патрон; `shotRaccoon` коричнева жолудеподібна з білою смужкою; `shotMurzik` рудий клубочок із білою цяткою. Зареєструвати в `index.js`.
- [ ] **Step 4:** `shot` у `balance.js` для всіх п'яти скінів; `shotSprite(meta)` = `(skinById(meta.skin) ?? M.skins[0]).shot`; `playerShotTexture` повертає `'webShot'`, якщо `relics.includes('web')`, інакше `shot`; у `Combat.js` замінити тернарник на `playerShotTexture(shotSprite(scene.meta), relics)`.
- [ ] **Step 5: Run** `npx vitest run && node --check src/config/balance.js && npm run build` → усе зелене.
- [ ] **Step 6: Commit** `git add -A && git commit -m "Постріл за скіном: 4 спрайти, shotSprite, playerShotTexture"`.

### Task 2: Логіка нагороди й нормалізація meta

**Files:**
- Create: `src/config/ads.js`, `src/systems/Ads.js`
- Modify: `src/systems/Meta.js` (`emptyMeta`, `normalizeMeta`: поле `adAt`)
- Test: `tests/ads.test.js`, `tests/meta.test.js`

**Interfaces:**
- Produces: у `config/ads.js` — `AD_MODE = 'stub'`, `REWARD_STEPS = 50`, `REWARD_COOLDOWN_MS = 120000`, `BANNER_HEIGHT_PX = 100`; у `Ads.js` — `rewardCooldownLeftMs(meta, nowMs): number`, `canWatchRewarded(meta, nowMs, mode = AD_MODE): boolean` (false при `'off'`), `grantReward(meta, nowMs): Meta` (`steps += REWARD_STEPS`, `adAt = nowMs`).

- [ ] **Step 1: Failing tests** (`ads.test.js`): без `adAt` → `rewardCooldownLeftMs === 0`; `adAt = now - 30000` → `90000`; `adAt = now + 999999` (майбутнє) → `0` (Review Focus 1); `canWatchRewarded` false при `mode='off'` і під час кулдауну, true після; `grantReward` додає рівно 50 і ставить `adAt`. `meta.test.js`: `normalizeMeta({adAt: -5})` і `{adAt:'x'}` → `adAt === 0`; валідне значення зберігається.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** як у Interfaces; `emptyMeta().adAt = 0`; `normalizeMeta` бере `adAt` лише якщо `isCount`.
- [ ] **Step 4: Run** `npx vitest run` → PASS (включно з `purity.test.js`).
- [ ] **Step 5: Commit** `git commit -am "Реклама: конфіг, логіка нагороди й кулдауну, adAt у meta"`.

### Task 3: AdService (заглушка) і зона банера

**Files:**
- Create: `src/ads/AdService.js`
- Modify: `src/systems/Layout.js` (додати `adBannerRect`)
- Test: `tests/layout.test.js`

**Interfaces:**
- Consumes: `AD_MODE`, `BANNER_HEIGHT_PX` з `config/ads.js`.
- Produces: `adBannerRect(width: number, height: number, mode = AD_MODE): {x, y, w, h} | null` (центр по x, прилягає до низу; `null` при `'off'`); `AdService.showBanner(scene): Banner | null` (`Banner.destroy()`; `null` при `'off'`); `AdService.showRewarded(scene): Promise<boolean>` (заглушка: затемнення, текст «РЕКЛАМА (заглушка)», відлік 3 с, кнопка «Закрити» з'являється лише після кінця й дає `true`; закриття раніше неможливе — кнопки до кінця нема; `'off'` → `false`).

- [ ] **Step 1: Failing tests:** `adBannerRect(720,1280)` → `{x:360, y:1230, w:720, h:100}`; `adBannerRect(720,1280,'off') === null`.
- [ ] **Step 2: Run** `npx vitest run tests/layout.test.js` → FAIL.
- [ ] **Step 3: Implement** `adBannerRect` у `Layout.js`; `AdService.js` — рендер заглушки на `scene.add` (depth 2000), `showBanner` малює сірий прямокутник із підписом «РЕКЛАМА (банер)»; `showRewarded` створює оверлей і повертає проміс, що вирішується на «Закрити» (`true`).
- [ ] **Step 4: Run** `npx vitest run && npm run build` → зелене.
- [ ] **Step 5: Commit** `git commit -am "AdService-заглушка і adBannerRect"`.

### Task 4: Слоти й кнопка в сценах

**Files:**
- Modify: `src/game/PauseController.js` (банер при `paused`, зсув кнопок за потреби в `relayout`), `src/scenes/GameOverScene.js` (банер, `data`-прапор щоб resize не дублював), `src/scenes/ShopScene.js` (кнопка «Реклама: +50 Шагів» на `y = height * 0.84`, відлік кулдауну, `grantReward` + `saveMeta`), `CLAUDE.md` (розділ «Стан»: `AD_MODE`, що це заглушка, ризики з дизайну)
- Test: ручна перевірка + `npm run build`; логіку вже закрито Tasks 1–3

**Interfaces:**
- Consumes: `AdService.showBanner/showRewarded`, `canWatchRewarded`, `rewardCooldownLeftMs`, `grantReward`, `adBannerRect`.

- [ ] **Step 1:** У `PauseController`: при вході в паузу `this.banner = AdService.showBanner(scene)`, при виході й у `relayout` — знищити/перебудувати; не накладатись на кнопки «Продовжити»/«У меню» (вони по центру, банер знизу).
- [ ] **Step 2:** У `GameOverScene.create`: `this.banner = AdService.showBanner(this)`; знищувати на `SHUTDOWN`; кнопка «Меню» на `0.86·height` не перекривається з банером (перевірити: `0.86·1280 = 1100` + половина кнопки < `1180`).
- [ ] **Step 3:** У `ShopScene.draw`: якщо `AD_MODE !== 'off'` — кнопка «Реклама: +50 Шагів» (сірий текст із відліком, поки `rewardCooldownLeftMs > 0`); тап → `await AdService.showRewarded(this)`; при `true` → `update_(grantReward(this.meta, Date.now()))` і `sfx('levelUp')`; повторний тап під час ролика ігнорується (прапор `this.adBusy`), `draw()` після resize не дублює нагороду.
- [ ] **Step 4: Verify** `npm test && npm run build` → зелене; у браузері (`npm run dev`): магазин показує кнопку, ролик ~3 с, +50 Шагів, кнопка сіра з відліком; пауза й екран смерті показують банер; `AD_MODE='off'` ховає все.
- [ ] **Step 5: Commit** `git commit -am "Місця реклами й кнопка Шагів у магазині (заглушка)"`.

---
Self-review: покриття — п.1 Task 1, п.2 Tasks 3–4, п.3 Tasks 2–4; типи `shotSprite`/`playerShotTexture`/`grantReward` узгоджені; Review Focus 1–5 мають тести (Task 2: п.1; Task 3: п.2/3 через логіку `adBannerRect` і заглушку; Task 4: п.4 вручну; Task 1: п.5).
