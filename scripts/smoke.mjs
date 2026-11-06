// Smoke-перевірка: піднімає `vite preview`, відкриває гру в headless Chromium,
// збирає помилки консолі й сторінки, робить скріншот smoke.png.
// Використання: npm run build && npm run smoke [-- --query "boss=1"]
// Якщо Playwright-браузер не встановлено (`npx playwright install chromium`),
// можна вказати свій Chrome: CHROME_PATH=/шлях/до/chrome npm run smoke
import { createServer } from 'node:net';
import { preview } from 'vite';
import { chromium } from 'playwright';

const WAIT_MS = 4000;
const VIEWPORT = { width: 360, height: 640 };

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const qIndex = process.argv.indexOf('--query');
const query = qIndex > -1 ? `?${process.argv[qIndex + 1]}` : '';

const port = await freePort();
const server = await preview({ preview: { port, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
const url = `http://127.0.0.1:${port}/${query}`;

const errors = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
let exitCode = 0;
try {
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(WAIT_MS);
  await page.screenshot({ path: 'smoke.png' });
  console.log(`smoke: ${url} — screenshot smoke.png`);
} catch (err) {
  errors.push(`smoke: ${err.message}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

if (errors.length) {
  console.error(`smoke: FAIL, ${errors.length} error(s):`);
  for (const e of errors) console.error('  ' + e);
  exitCode = 1;
} else {
  console.log('smoke: OK, no console errors');
}
process.exit(exitCode);
