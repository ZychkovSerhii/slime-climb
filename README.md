# Slime Climb

Мобільна гра під Android: слизак стрибає між двома стінами і лізе вгору, автоматично відстрілюючись від ворогів.
Phaser 4 + Vite, обгортка під Android — Capacitor.

Специфікація: `docs/superpowers/specs/2026-11-07-slime-climb-mvp-design.md`
План: `docs/superpowers/plans/2026-11-07-slime-climb-mvp.md`

## Запуск

Потрібен Node 22+.

```bash
npm i            # встановити залежності (один раз)
npm run dev      # дев-сервер з автоперезавантаженням, відкрий адресу з консолі
npm test         # автотести логіки (Vitest)
npm run build    # збірка в dist/
npm run smoke    # після build: відкриває гру в headless Chromium, ловить помилки, робить smoke.png
```

Для `npm run smoke` потрібен браузер Playwright: `npx playwright install chromium`
(або вказати свій Chrome змінною `CHROME_PATH`).

## Debug-параметри

- `?debug=1` — лічильник fps у кутку (на телефоні: `const DEBUG = true` у `src/main.js`).
- `?boss=1` — бос-павук з'являється на 5-й секунді замість 2:00.

Наприклад: `http://localhost:5173/?boss=1&debug=1`. Smoke з босом: `npm run smoke -- --query boss=1 --wait 9000`.

## Android

Як зібрати APK і що перевірити на телефоні — `docs/android-build.md`.

## Структура

```
index.html            точка входу сторінки
src/main.js           конфіг Phaser, реєстрація сцен
src/scenes/           сцени (Boot генерує текстури-заглушки, Game — ігровий світ)
src/config/           числа балансу (з'явиться в Task 2)
src/systems/          чиста логіка без Phaser, покрита тестами
src/entities/         ігрові об'єкти
tests/                тести Vitest
scripts/smoke.mjs     smoke-перевірка в браузері
docs/superpowers/     специфікація і план
```
