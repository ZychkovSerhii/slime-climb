// Малювання сітки в будь-що з API Phaser.Graphics (fillStyle + fillRect). Без Phaser.
import { EMPTY } from './grid.js';

/**
 * rows — сітка, pal — символ → колір, x/y — зсув у пікселях, cell — розмір клітинки,
 * flipX — віддзеркалити по горизонталі.
 */
export function paintGrid(g, rows, pal, { x = 0, y = 0, cell = 4, flipX = false } = {}) {
  rows.forEach((row, j) => {
    const w = row.length;
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === EMPTY) continue;
      const col = flipX ? w - 1 - i : i;
      g.fillStyle(pal[ch], 1);
      g.fillRect(x + col * cell, y + j * cell, cell, cell);
    }
  });
}
