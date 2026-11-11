// Кірка льоду поверх ворога під «Крижаною атакою». Масштабується під розмір ворога (entities/Enemy.setFrost).
export default {
  key: 'frost',
  w: 32,
  h: 32,
  cell: 4,
  palette: { w: 0xffffff, c: 0xbff4ff, b: 0x6fd0ff },
  frames: {
    frost: [
      'w..c..b.',
      '.c.bc...',
      '..b..c.w',
      'c......c',
      'b.......',
      '.c....bc',
      'w.cb.c..',
      '..c..w.b',
    ],
  },
};
