// Робота з піксельними сітками. Сітка — масив рядків однакової довжини;
// символ — ключ кольору в палітрі спрайта, '.' — прозоро. Без Phaser.

export const EMPTY = '.';

/** Порядок кадрів спрайта = порядок у стрічці текстури = порядок у PNG-заміні. */
export function frameNames(sprite) {
  return Object.keys(sprite.frames ?? {});
}

/** Контур: прозора клітинка поруч (по 4 сторонах) із заповненою стає символом ink. */
export function outline(rows, ink = 'k') {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? EMPTY : rows[y][x]);
  return rows.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (ch !== EMPTY) return ch;
        const near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((c) => c !== EMPTY && c !== ink);
        return near ? ink : EMPTY;
      })
      .join(''),
  );
}

/** Де всередині полотна w×h починається сітка (по центру, ціле число пікселів). */
export function gridOrigin(sprite, rows) {
  const gw = (rows[0]?.length ?? 0) * sprite.cell;
  const gh = rows.length * sprite.cell;
  return { x: Math.floor((sprite.w - gw) / 2), y: Math.floor((sprite.h - gh) / 2) };
}

/** Список помилок опису спрайта (порожній — усе гаразд). */
export function validateSprite(sprite) {
  const errs = [];
  const { key } = sprite;
  if (!key) errs.push('немає key');
  if (!(sprite.w > 0 && sprite.h > 0)) errs.push(`${key}: w/h мають бути > 0`);
  if (typeof sprite.draw === 'function') return errs;
  const names = frameNames(sprite);
  if (names.length === 0) errs.push(`${key}: немає кадрів`);
  for (const name of names) {
    const rows = sprite.frames[name];
    if (!Array.isArray(rows) || rows.length === 0) {
      errs.push(`${key}.${name}: порожня сітка`);
      continue;
    }
    const len = rows[0].length;
    if (rows.some((r) => r.length !== len)) errs.push(`${key}.${name}: рядки різної довжини`);
    for (const ch of new Set(rows.join(''))) {
      if (ch !== EMPTY && sprite.palette?.[ch] === undefined) errs.push(`${key}.${name}: колір '${ch}' не в палітрі`);
    }
    if (len * sprite.cell > sprite.w || rows.length * sprite.cell > sprite.h) errs.push(`${key}.${name}: сітка не влазить у полотно`);
  }
  for (const [anim, cfg] of Object.entries(sprite.anims ?? {})) {
    for (const f of cfg.frames ?? []) if (!names.includes(f)) errs.push(`${key}:${anim}: немає кадру '${f}'`);
    if (!(cfg.fps > 0)) errs.push(`${key}:${anim}: fps має бути > 0`);
  }
  return errs;
}
