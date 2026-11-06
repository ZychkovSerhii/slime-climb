import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const dir = join(import.meta.dirname, '..', 'src', 'systems');

test('src/systems/* do not import Phaser', () => {
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    expect(src, f).not.toMatch(/from\s+['"]phaser['"]/);
  }
});
