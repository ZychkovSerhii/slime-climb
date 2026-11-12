# Таблиця лідерів — що зробити користувачу (етап 12)

Уже зроблено: база D1 `slime-climb` (регіон EEUR) створена у твоєму акаунті Cloudflare, схема застосована,
її id записано в `server/wrangler.toml`. Лишилося розгорнути сам Worker — через підключення Claude до Cloudflare
цього зробити не можна, потрібен токен або вхід через wrangler.

**Токен нікому не надсилай, у чат з Claude теж.** Він дає керувати Worker'ами твого акаунта.

## Варіант 1 (рекомендований): автоматичне розгортання з GitHub
1. dash.cloudflare.com → у правому верхньому куті профіль → **My Profile → API Tokens → Create Token**.
2. Шаблон **Edit Cloudflare Workers** → **Use template**. У **Permissions** додай рядок: *Account → D1 → Edit*.
   **Account Resources**: свій акаунт. **Create Token** → скопіюй токен (показується один раз).
3. **Account ID**: dash.cloudflare.com → Workers & Pages → праворуч «Account ID» (або в адресі сторінки після `dash.cloudflare.com/`).
4. GitHub → репозиторій `slime-climb` → **Settings → Secrets and variables → Actions → New repository secret**:
   - `CLOUDFLARE_API_TOKEN` — токен з кроку 2;
   - `CLOUDFLARE_ACCOUNT_ID` — id з кроку 3.
5. Напиши Claude «секрети додав». Він запустить workflow **Leaderboard deploy**, перевірить сервер і впише його адресу
   (`https://slime-climb-leaderboard.<твій-субдомен>.workers.dev`) у `src/config/leaderboard.js`.

Далі кожна зміна сервера в `main` розгортається сама.

## Варіант 2: вручну зі свого комп'ютера
У `D:\Soft\DEV\slime-climb\server`: `npx wrangler login` (відкриється браузер) → `npx wrangler deploy`.
Кожну зміну сервера доведеться розгортати так само вручну.

## Модерація
Дашборд → Storage & Databases → D1 → `slime-climb` → **Console** (або попроси Claude — у нього є доступ до бази):
- подивитися: `SELECT nick, height, time_sec FROM scores ORDER BY height DESC;`
- видалити нік: `DELETE FROM scores WHERE nick = 'нік';`
- **перед релізом стерти все:** `DELETE FROM scores;`

## Перед релізом у Google Play
- Play Console → Data safety: гра надсилає нік, висоту, час забігу і випадковий ID пристрою (не рекламний).
- Політика конфіденційності з тим самим переліком і способом попросити видалення.
