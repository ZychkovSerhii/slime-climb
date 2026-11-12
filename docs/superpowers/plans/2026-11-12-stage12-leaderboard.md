# Етап 12 — таблиця лідерів: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Онлайн-таблиця лідерів за висотою (топ-50 + своє місце) для забігів на «Нормі», з ніком і фільтром мату, без зависань гри офлайн.

**Architecture:** Спільні чисті правила (`src/systems/LeaderboardRules.js`, `Profanity.js`) імпортують і клієнт, і Worker (wrangler бандлить відносні імпорти). Клієнт: черга й ID пристрою в `localStorage` (`src/systems/Leaderboard.js`), HTML-шар таблиці за зразком довідника (`src/leaderboard/`). Сервер: один Cloudflare Worker (`server/src/index.js`) з D1; тести на фейковому D1 поверх `node:sqlite`.

**Tech Stack:** Phaser 4, Vite, Vitest, Capacitor 8; Cloudflare Workers + D1, wrangler (CI), `node:sqlite` (Node ≥ 22.13) лише в тестах.

**Spec:** `docs/superpowers/specs/2026-11-12-leaderboard-design.md`

## Global Constraints
- Нік 3–16 символів після `trim`; дозволено кирилицю, латиницю, цифри, пробіл, `_ - .`; без емодзі. Однакові ніки дозволені.
- Висота = `heightPoints(distancePx)` (без очок за вбивства).
- Зараховується лише `isDefault(tuning)` і порожній `location.search` (будь-який URL-параметр = дебаг).
- У таблиці один рядок на ID пристрою — найкращий результат; гірший результат не знижує.
- Ліміт: не частіше ніж раз на 20 000 мс з одного ID (і `/score`, і `/nick`) → 429.
- Топ — 50 рядків, сортування `height DESC, updated_at ASC` (раніший рекорд вище).
- Мережа ніколи не блокує гру: таймаут запиту 5000 мс, усі помилки ковтаються, сховище може кидати.
- Поки `LEADERBOARD_URL === ''` — нічого не надсилається, шар показує «Таблиця ще не підключена».
- Тексти інтерфейсу українською. Без нових npm-залежностей у грі; `wrangler` лише в CI через `npx`.

## Review Focus
1. Повтор `GameOver.create` при зміні розміру екрана — результат ставиться в чергу **один раз** (тест у Task 6 через `data.lb ??=`; пінимо в Task 3 тестом «enqueue двічі той самий забіг не дублює»).
2. Сервер недоступний / таймаут / 500 / не-JSON — `flush` повертає `{status:'offline'}`, черга лишається (тест у Task 3).
3. Нік лише з пробілів, з пробілами по краях, з емодзі, рівно 16 / 17 символів (тести в Task 1).
4. Обхід фільтра латиницею-двійниками й розділювачами (`xyй`, `х.у.й`, `ХУЙЙЙ`) (тести в Task 1).
5. Гірший результат після кращого — `best` на сервері не падає, ранг рахується від найкращого (тест у Task 4).

---

### Task 1: Спільні правила — нік, фільтр мату, правдоподібність, зарахування

**Files:**
- Create: `src/systems/Profanity.js`, `src/systems/LeaderboardRules.js`
- Test: `tests/leaderboardRules.test.js`

**Interfaces:**
- Produces (`Profanity.js`): `normalizeForFilter(s: string): string`, `isProfane(s: string): boolean`
- Produces (`LeaderboardRules.js`): `NICK_MIN = 3`, `NICK_MAX = 16`, `validateNick(raw: unknown): {ok: true, nick: string} | {ok: false, error: 'short'|'long'|'chars'|'profane'}`, `maxHeightPoints(timeSec: number): number`, `isPlausible({height, timeSec}): boolean`, `isEligibleRun({tuning, search}): boolean`, `MAX_RUN_SEC = 3 * 3600`

- [ ] **Step 1: Write the failing tests** — `tests/leaderboardRules.test.js`:
  - `validateNick('  Сашко  ')` → `{ok:true, nick:'Сашко'}`; `validateNick('   ')` → `error:'short'`; `'ab'` → `short`; `'a'.repeat(16)` ok; `'a'.repeat(17)` → `long`; `'Slime😀'` → `chars`; `'x<y'` → `chars`; `'Dr_Slime-2.0'` ok; `validateNick(42)` → `short`.
  - внутрішні пробіли: `'Сашко   Ко'` → `nick:'Сашко Ко'` (кілька пробілів → один).
  - `isProfane` true: `'хуй'`, `'ХУЙЙЙ'`, `'xyй'` (латинські x, y), `'х.у.й'`, `'bl@dь'`, `'fuck'`, `'FuCk_off'`, `'сука'`, `'пизда'`, `'єбать'`, `'ебать'`; false: `'Сашко'`, `'Слизень'`, `'Скупий'`, `'Hello'`, `'Корабель'`. Тоді `validateNick('xyй')` → `error:'profane'`.
  - `maxHeightPoints(0) === 0`; `maxHeightPoints(10)` дорівнює `Math.floor((120*10 + 1.1*10*10/2)/10)` = `125`; після насичення (t = (520−120)/1.1 ≈ 363,6 с) росте на 52 за секунду: `maxHeightPoints(1000) - maxHeightPoints(999)` ≈ 52 (±1). Значення брати з `BALANCE.scrollBase/scrollGrowth/maxScrollSpeed/pxPerPoint`, не хардкодити в коді.
  - `isPlausible({height: maxHeightPoints(300), timeSec: 300})` true; `height: maxHeightPoints(300) + 20` false; `height:-1` false; `height: 1.5` false; `timeSec: MAX_RUN_SEC + 1` false; `timeSec: NaN` false.
  - `isEligibleRun({tuning: defaultTuning(), search: ''})` true; `search: '?loop=1'` false; `tuning: PRESETS.hard.values` false.

- [ ] **Step 2: Run** `npx vitest run tests/leaderboardRules.test.js` — Expected: FAIL (модулів немає).

- [ ] **Step 3: Implement `Profanity.js`.** `normalizeForFilter`: нижній регістр; латиниця-двійники → кирилиця (`a→а b→в c→с e→е h→н k→к m→м o→о p→р t→т x→х y→у i→і`, плюс `3→з 0→о 6→б @→а $→с`); прибрати все, що не літера; згорнути повтори (`ййй→й`); `ё→е`, `ї/і→и` для зіставлення. Перевіряти **двічі**: нормалізований рядок з транслітерацією (для кириличних коренів) і сирий латинський нижній регістр без розділювачів (для англійських). Корені — масив `ROOTS` (укр/рос: `хуй хуе хуя пизд пізд еба ёба їба ебл бля блять сука сучк мудак мудил залуп гандон пидор підор педик шлюх дроч манда`; англ: `fuck shit bitch cunt dick nigg fag whore`). Корінь `сука` збігатиметься як підрядок; переконайся, що `'Скупий'` проходить (тест).

- [ ] **Step 4: Implement `LeaderboardRules.js`.** `validateNick`: не рядок → `short`; `trim` + згорнути пробіли; довжина в кодових точках (`[...s].length`); символи `/^[\p{Script=Cyrillic}A-Za-z0-9 _.\-]+$/u`; порядок перевірок short → long → chars → profane. `maxHeightPoints(t)`: аналітичний інтеграл `min(scrollBase + scrollGrowth·s, maxScrollSpeed)` від 0 до t, поділити на `pxPerPoint`, `Math.ceil`, плюс запас `+ 2` (округлення кадрів). `isPlausible`: `Number.isInteger(height) && height >= 0 && Number.isFinite(timeSec) && timeSec >= 0 && timeSec <= MAX_RUN_SEC && height <= maxHeightPoints(timeSec)`. `isEligibleRun`: `isDefault(tuning) && (search ?? '') === ''`.
  Перевір тестом із Step 1 точне значення для t=10 з урахуванням запасу (тест пише `<=` і `>=` очікуване − 0 та + 3, а не точну рівність — підправ тест під обраний запас один раз і зафіксуй).

- [ ] **Step 5: Run** `npx vitest run tests/leaderboardRules.test.js tests/purity.test.js` — Expected: PASS.

- [ ] **Step 6: Commit** `git commit -m "Етап 12: правила таблиці лідерів — нік, фільтр мату, правдоподібність"`

---

### Task 2: Фейковий D1 для тестів

**Files:**
- Create: `tests/helpers/fakeD1.js`
- Test: `tests/fakeD1.test.js`

**Interfaces:**
- Produces: `createFakeD1(schemaSql: string): D1Like`, де `D1Like.prepare(sql).bind(...args)` повертає об'єкт з `first(): Promise<row|null>`, `all(): Promise<{results: row[]}>`, `run(): Promise<{meta:{changes:number}}>` — підмножина API D1, яку використовує Worker.

- [ ] **Step 1: Test** — створити таблицю `t(a INT)`, `run` insert з `bind(5)`, `first('select a from t')` → `{a:5}`, `all` → `results.length === 1`; `prepare` без `bind` теж працює.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** через `DatabaseSync(':memory:')` з `node:sqlite`; `exec(schemaSql)`; методи повертають Promise.
- [ ] **Step 4: Run** — PASS (попередження ExperimentalWarning допустиме).
- [ ] **Step 5: Commit** `git commit -m "Етап 12: фейковий D1 для тестів сервера"`

---

### Task 3: Клієнт — ID пристрою, нік, черга, відправка

**Files:**
- Create: `src/systems/Leaderboard.js`, `src/config/leaderboard.js`
- Test: `tests/leaderboard.test.js`

**Interfaces:**
- Consumes: `validateNick`, `isPlausible` (Task 1).
- Produces (`config/leaderboard.js`): `export const LEADERBOARD_URL = ''` (без кінцевого `/`), `REQUEST_TIMEOUT_MS = 5000`.
- Produces (`Leaderboard.js`), усі функції не кидають:
  - `playerId(storage, random = Math.random): string` — 16 hex-символів, створюється один раз (`slime-climb.lb.id`).
  - `loadNick(storage): string | null`, `saveNick(storage, nick): boolean` (`slime-climb.lb.nick`; зберігає лише валідний нік).
  - `enqueueResult(storage, {height, timeSec}): void` — ключ `slime-climb.lb.pending`; зберігає **лише найкращий** очікуваний результат (менший ігнорується); непридатний за `isPlausible` — ігнорується.
  - `pendingResult(storage): {height, timeSec} | null`.
  - `flush(storage, {url, fetchFn = fetch, timeoutMs}): Promise<{status: 'disabled'|'nonick'|'empty'|'sent'|'offline'|'rejected', rank?: number, best?: number}>` — `url === ''` → `disabled`; немає ніка → `nonick` (черга лишається); немає черги → `empty`; POST `${url}/score` JSON `{id, nick, height, timeSec}`; 200 → чистить чергу, `sent` + `rank`, `best`; 400/422 → чистить чергу, `rejected`; 429/5xx/мережа/таймаут/не-JSON → `offline`, черга лишається.
  - `fetchTop(storage, {url, fetchFn, timeoutMs}): Promise<{status:'ok', top: {nick, height}[], me: {rank, height} | null} | {status: 'disabled'|'offline'}>` — GET `${url}/top?id=<id>`.
  - `sendNick(storage, nick, {url, fetchFn, timeoutMs}): Promise<'ok'|'invalid'|'offline'|'disabled'>` — валідує, зберігає локально навіть офлайн, POST `${url}/nick`.

- [ ] **Step 1: Write tests** з `memStorage` (як у `tests/tuning.test.js`) і `brokenStorage` (усі методи кидають) та фейковим `fetchFn`:
  - `playerId` стабільний між викликами, `/^[0-9a-f]{16}$/`; з `brokenStorage` не кидає і повертає рядок.
  - `enqueueResult` 100 потім 80 → pending `height 100`; потім 120 → 120; двічі той самий `{height:100,timeSec:60}` → один запис (Review Focus 1); неправдоподібний (висота > `maxHeightPoints`) → черга не змінюється.
  - `flush`: `url ''` → `disabled` і `fetchFn` не викликано; без ніка → `nonick`; 200 `{rank:3,best:150}` → `{status:'sent',rank:3,best:150}` і черга порожня; тіло запиту містить `id, nick, height, timeSec`; 429 → `offline`, черга лишилась; `fetchFn` кидає → `offline`; `fetchFn` ніколи не завершується → `offline` після `timeoutMs` (передати 20); 200 з тілом `'oops'` → `offline`; 422 → `rejected`, черга порожня.
  - `fetchTop` 200 → `ok` з `top` і `me`; кидає → `offline`.
  - `sendNick('  Ко ля ')` зберігає `'Ко ля'`; `sendNick('хуй')` → `invalid`, локальний нік не змінився; офлайн → `offline`, але `loadNick` уже новий.
- [ ] **Step 2: Run** `npx vitest run tests/leaderboard.test.js` — FAIL.
- [ ] **Step 3: Implement.** Таймаут — `AbortController` + `Promise.race` з таймером (на випадок, коли `fetchFn` ігнорує `signal`). Усе в `try/catch`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git commit -m "Етап 12: клієнт таблиці лідерів — ID, нік, черга, відправка"`

---

### Task 4: Сервер — Worker + D1

**Files:**
- Create: `server/src/index.js`, `server/schema.sql`, `server/wrangler.toml`
- Test: `tests/server.test.js`

**Interfaces:**
- Consumes: `validateNick`, `isPlausible` (Task 1), `createFakeD1` (Task 2).
- Produces: `export default { fetch(request, env) }` і для тестів `export async function handle(request, env, nowMs: number): Promise<Response>`.
- Схема:
  ```sql
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY, nick TEXT NOT NULL, height INTEGER NOT NULL DEFAULT 0,
    time_sec INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, last_submit_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS scores_height ON scores (height DESC, updated_at ASC);
  ```
- Маршрути (усі відповіді JSON + CORS; `OPTIONS` → 204):
  - `POST /score {id, nick, height, timeSec}` → 400 погане тіло / `id` не `/^[0-9a-f]{16}$/`; 422 `{error}` невалідний нік чи `!isPlausible`; 429 якщо `now - last_submit_at < 20000`; інакше upsert: `nick` оновлюється завжди, `height = max(old, new)` (і `time_sec`, `updated_at` — лише коли висота зросла), `last_submit_at = now` → 200 `{rank, best}`.
  - `POST /nick {id, nick}` → ті самі 400/422/429; якщо рядка немає — створює з `height 0`; → 200 `{ok:true}`.
  - `GET /top?id=…` → 200 `{top: [{nick, height}] (≤50, лише height > 0), me: {rank, height} | null}`; `rank = 1 + count(height > мій)` + `count(height = мій AND updated_at < мій)`; `me` null, якщо рядка немає або `height 0`.
  - Інше → 404.
- CORS: `Access-Control-Allow-Origin` віддзеркалює `Origin`, якщо він `https://localhost`, `capacitor://localhost` або `http://localhost:<порт>`/`http://127.0.0.1:<порт>`; інакше заголовок не ставиться. `Allow-Methods: GET, POST, OPTIONS`, `Allow-Headers: Content-Type`.
- `wrangler.toml`: `name = "slime-climb-leaderboard"`, `main = "src/index.js"`, `compatibility_date = "2026-11-01"`, `[[d1_databases]] binding = "DB"`, `database_name = "slime-climb"`, `database_id = "REPLACE_ME"` (коментар: id з дашборда Cloudflare, не секрет).

- [ ] **Step 1: Write tests** (`env = {DB: createFakeD1(readFileSync('server/schema.sql'))}`, власний `now`):
  - POST валідний → 200 `{rank:1,best:100}`; другий гравець 150 → rank 1, перший тепер rank 2 у `/top`.
  - той самий ID: 100, потім (через 21 с) 80 → `best 100`, `/top` показує 100 (Review Focus 5); потім 130 → `best 130`.
  - повтор через 5 с → 429.
  - нік `'хуй'` → 422; висота > `maxHeightPoints(timeSec)` → 422; `id: 'abc'` → 400; тіло не JSON → 400.
  - `/nick` змінює нік, наступний `/top` показує новий; `/nick` для нового ID створює рядок, але `/top` його не показує (`height 0`), `me` = null.
  - `/top` з 60 гравцями → 50 рядків, відсортовано спаданням; однакова висота — раніший `updated_at` вище.
  - `OPTIONS` з `Origin: https://localhost` → 204 і заголовок віддзеркалено; `Origin: https://evil.example` → без `Access-Control-Allow-Origin`.
  - `GET /nope` → 404.
- [ ] **Step 2: Run** `npx vitest run tests/server.test.js` — FAIL.
- [ ] **Step 3: Implement** `server/src/index.js` (імпорти `../../src/systems/LeaderboardRules.js`), `schema.sql`, `wrangler.toml`. Upsert — `INSERT … ON CONFLICT(id) DO UPDATE SET …` з `CASE WHEN excluded.height > scores.height …` (SQLite однаковий у D1 і `node:sqlite`).
- [ ] **Step 4: Run** `npx vitest run` (усі тести) — PASS.
- [ ] **Step 5: Commit** `git commit -m "Етап 12: Worker таблиці лідерів на D1"`

---

### Task 5: Розгортання з CI + інструкція користувачу

**Files:**
- Create: `.github/workflows/leaderboard-deploy.yml`, `docs/leaderboard-setup.md`

**Interfaces:**
- Consumes: `server/wrangler.toml`, `server/schema.sql` (Task 4).

- [ ] **Step 1: Workflow** — `on: push` у `main` з `paths: [server/**, src/systems/LeaderboardRules.js, src/systems/Profanity.js, src/config/balance.js, .github/workflows/leaderboard-deploy.yml]` + `workflow_dispatch`. Перший крок перевіряє наявність `secrets.CLOUDFLARE_API_TOKEN` і `CLOUDFLARE_ACCOUNT_ID` та `database_id != REPLACE_ME`; якщо чогось бракує — `echo "::notice::…"` і завершення без помилки. Далі `npm ci`, `npm test`, у `server/`: `npx wrangler@4 d1 execute slime-climb --remote --file schema.sql` і `npx wrangler@4 deploy` з `env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID`.
- [ ] **Step 2: Перевірка синтаксису** — `npx --yes yaml-lint .github/workflows/leaderboard-deploy.yml` або `node -e "require('yaml')"`-аналог; Expected: без помилок. Якщо лінтера немає офлайн — `python3 -c "import yaml,sys;yaml.safe_load(open(sys.argv[1]))" <file>`.
- [ ] **Step 3: `docs/leaderboard-setup.md`** — кроки для користувача українською: (1) зареєструватися на dash.cloudflare.com (безкоштовно); (2) Workers & Pages → D1 → Create → назва `slime-climb` → скопіювати Database ID і надіслати Claude (не секрет); (3) Account ID зі сторінки акаунта; (4) My Profile → API Tokens → Create Token → шаблон «Edit Cloudflare Workers» + дозвіл `D1: Edit`; (5) GitHub → Settings → Secrets and variables → Actions → додати `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; (6) повідомити Claude — він впише `database_id` і адресу `https://slime-climb-leaderboard.<субдомен>.workers.dev` у `src/config/leaderboard.js`; (7) видалити запис: D1 → slime-climb → Console → `DELETE FROM scores WHERE nick = '…';`; стерти все перед релізом: `DELETE FROM scores;`. Попередження: токен нікому не надсилати, у чат теж.
- [ ] **Step 4: Commit** `git commit -m "Етап 12: розгортання Worker з CI та інструкція"`

---

### Task 6: Інтерфейс — шар «Лідери», меню, екран кінця забігу, «Назад»

**Files:**
- Create: `src/leaderboard/LeaderboardOverlay.js`, `src/leaderboard/index.js`
- Modify: `src/scenes/MenuScene.js` (кнопка «Лідери», `flush` при вході), `src/scenes/GameScene.js:585` (передати `height`, `eligible`), `src/scenes/GameOverScene.js` (черга + рядок статусу), `src/systems/Navigation.js`, `src/main.js:66-75`
- Test: `tests/navigation.test.js`, `tests/leaderboardStatus.test.js`

**Interfaces:**
- Consumes: усе з Task 3 і `LEADERBOARD_URL`.
- Produces: `leaderboard(): {open(), close(), isOpen()}`, `leaderboardOpen(): boolean` (як `codex()` / `codexOpen()`); `backAction(active, paused, codexOpen, leaderboardOpen = false)` → `'closeLeaderboard'` перед усім іншим, крім `closeCodex`; `statusLine(status: {eligible, result?: FlushResult}): string` у `src/systems/Leaderboard.js`.
- Рядки `statusLine`: не eligible → `'Не Норма — у таблицю не йде'`; `disabled` → `''`; `nonick` → `'Введи нік у «Лідери», щоб потрапити в таблицю'`; `sent` → `` `Твоє місце: ${rank}` ``; `rejected` → `'Результат не прийнято'`; `offline` → `'Офлайн — надішлемо пізніше'`; ще не відповіло → `'Надсилається…'`; `empty` → `''`.

- [ ] **Step 1: Tests** — `backAction(['Menu'], false, false, true) === 'closeLeaderboard'`; `backAction(['Menu'], false, true, true) === 'closeCodex'`; наявні тести навігації без змін проходять. `tests/leaderboardStatus.test.js` — кожен рядок `statusLine` з переліку вище.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `backAction` і `statusLine`; `main.js`: `if (action === 'closeLeaderboard') leaderboard().close()`.
- [ ] **Step 4: Overlay** за зразком `src/codex/CodexOverlay.js` (той самий стиль CSS, `z-index:20`, safe-area): шапка «Лідери» + «Закрити»; блок ніка (поле `maxlength=16`, кнопка «Зберегти», текст помилки: short «Щонайменше 3 символи», long «Не більше 16», chars «Лише літери, цифри, пробіл, _ - .», profane «Обери інший нік»); список топ-50 (місце, нік, висота; власний рядок підсвічено), під ним «Ти: N місце» якщо поза топом; стани: `disabled` → «Таблиця ще не підключена», завантаження «Завантаження…», `offline` → «Немає зв'язку» + «Спробувати ще». Нік рендерити через `textContent` (не `innerHTML`). При відкритті: `flush`, потім `fetchTop`. Після збереження ніка — `sendNick`, потім `flush`, потім оновити список.
- [ ] **Step 5: Menu** — кнопка `button(this, cx, height * 0.79, 'Лідери', () => leaderboard().open())`, «Довідник» зсунути так, щоб рядки не налазили (перевірити в браузері на 360×640 і 412×915); тап-старт гри ігнорує відкритий шар (`codexOpen() || leaderboardOpen()`); `flush(...)` без очікування при `create`.
- [ ] **Step 6: GameScene → GameOver** — у виклику `scene.start('GameOver', …)` додати `height: heightPoints(this.distancePx)` і `eligible: isEligibleRun({tuning: tuning(), search: window.location.search})`. У `GameOverScene.create`: `data.lb ??= (eligible && enqueueResult(...), {eligible})` — один раз; рядок статусу на `height * 0.67` (зсунути підказку й «Меню», щоб не налазили); якщо eligible і `LEADERBOARD_URL` — `flush` і оновити текст, коли прийде відповідь (перевірити, що сцена ще активна: `this.sys.isActive()`); результат зберегти в `data.lb.result`, щоб після resize не надсилати вдруге. Коли статус `nonick` — рядок клікабельний і відкриває `leaderboard()` з фокусом на полі ніка (рішення дизайну: нік питаємо при першій відправці); тап по ньому не запускає нову гру. Також показати висоту: `` `висота ${height}` `` поруч із часом.
- [ ] **Step 7: Run** `npm test && npm run build` — PASS.
- [ ] **Step 8: Перевірка в браузері** (`npm run dev`, Playwright у хмарі): меню з «Лідери» → шар «Таблиця ще не підключена» → закрити; забіг до смерті без параметрів URL → рядок статусу порожній (URL не задано) — тимчасово підставити `LEADERBOARD_URL` на локальний `npx wrangler@4 dev` у `server/` (локальний D1, `--local`) і перевірити: нік, «Твоє місце: 1», топ, «Не Норма» з `?loop=1`. Скриншоти меню й екрана кінця на 360×640. Повернути `LEADERBOARD_URL = ''`.
- [ ] **Step 9: Бот** `node scripts/playtest.mjs --seconds 220 --runs 2` — без падінь (бот запускає з параметрами URL → «Не Норма», мережа не чіпається).
- [ ] **Step 10: Commit** `git commit -m "Етап 12: шар «Лідери», рядок місця після забігу, «Назад»"`

---

### Task 7: Документація стану

**Files:**
- Modify: `CLAUDE.md` (розділ «Стан», «Наступний етап» → «Етап 12 — коротко», «Де що»), `docs/superpowers/specs/2026-11-12-leaderboard-design.md` (розділ «Як зроблено»)

- [ ] **Step 1:** У «Стан» — етап 12 зроблено (код), але сервер не розгорнуто до кроків користувача з `docs/leaderboard-setup.md`; стирання перед релізом `DELETE FROM scores;`; Data safety й політика конфіденційності — до релізу. «Де що»: файли з Tasks 1–6. Розбіжності з дизайном (шар HTML замість `LeaderboardScene`, будь-який URL-параметр = дебаг, `/nick`) — у «Як зроблено».
- [ ] **Step 2:** `npm test` — PASS.
- [ ] **Step 3: Commit** `git commit -m "Етап 12: CLAUDE.md і «як зроблено»"`, push, PR у `main`, дочекатися CI (APK), злити.
