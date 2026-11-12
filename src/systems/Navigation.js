/**
 * Що робить системна кнопка «Назад» (Android) залежно від активних сцен.
 * 'pause' — пауза з «Продовжити», 'menu' — у меню, 'exit' — вийти з застосунку, 'none' — нічого,
 * 'closeCodex' — закрити довідник (етап 7: він HTML-шар поверх меню, а не сцена).
 */
export function backAction(activeSceneKeys, gamePaused, codexOpen = false) {
  if (codexOpen) return 'closeCodex';
  if (activeSceneKeys.includes('Game')) return gamePaused ? 'none' : 'pause';
  if (['GameOver', 'Shop', 'Achievements', 'Tuning'].some((k) => activeSceneKeys.includes(k))) return 'menu';
  if (activeSceneKeys.includes('Menu')) return 'exit';
  return 'none';
}
