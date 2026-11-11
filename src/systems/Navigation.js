/**
 * Що робить системна кнопка «Назад» (Android) залежно від активних сцен.
 * 'pause' — пауза з «Продовжити», 'menu' — у меню, 'exit' — вийти з застосунку, 'none' — нічого.
 */
export function backAction(activeSceneKeys, gamePaused) {
  if (activeSceneKeys.includes('Game')) return gamePaused ? 'none' : 'pause';
  if (['GameOver', 'Shop', 'Achievements'].some((k) => activeSceneKeys.includes(k))) return 'menu';
  if (activeSceneKeys.includes('Menu')) return 'exit';
  return 'none';
}
