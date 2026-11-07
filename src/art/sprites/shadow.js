// Тінь-попередження удару боса. Не сітка, а функція draw — так теж можна.
export default {
  key: 'shadow',
  w: 120,
  h: 40,
  draw(g) {
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(60, 20, 120, 40);
  },
};
