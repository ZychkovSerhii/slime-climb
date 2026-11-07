// PNG-заміни: будь-який файл src/art/png/<key>.png підхоплюється збіркою автоматично
// і використовується замість намальованої кодом сітки. Код для цього правити не треба.
const files = import.meta.glob('./png/*.png', { eager: true, query: '?url', import: 'default' });

/** key → url зібраного файлу. */
export const PNG_OVERRIDES = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop().replace(/\.png$/i, ''), url]),
);
