import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from 'vitest';

// Запобіжник модульності (docs/architecture-2026-11-13.md): файли не розростаються мовчки.
// Виняток — GameScene: стеля опускається після кожного кроку рефакторингу, піднімати її не можна.
const LIMIT = 650;
const EXCEPTIONS = { 'scenes/GameScene.js': 1370 };

const root = join(import.meta.dirname, '..', 'src');
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

test('жоден файл src не довший за стелю', () => {
  const tooLong = walk(root)
    .map((p) => ({ file: relative(root, p).replaceAll('\\', '/'), lines: readFileSync(p, 'utf8').split('\n').length }))
    .filter(({ file, lines }) => lines > (EXCEPTIONS[file] ?? LIMIT));
  expect(tooLong).toEqual([]);
});
