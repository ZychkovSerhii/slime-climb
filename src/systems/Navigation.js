/**
 * Що робить системна кнопка «Назад» (Android) залежно від активних сцен.
 * 'pause' — пауза з «Продовжити», 'menu' — у меню, 'exit' — вийти з застосунку, 'none' — нічого,
 * 'closeCodex' — закрити довідник (етап 7: він HTML-шар поверх меню, а не сцена),
 * 'closeLeaderboard' — закрити шар «Лідери» (етап 12, теж HTML).
 */
export function backAction(activeSceneKeys, gamePaused, codexOpen = false, leaderboardOpen = false) {
  if (codexOpen) return 'closeCodex';
  if (leaderboardOpen) return 'closeLeaderboard';
  if (activeSceneKeys.includes('Game')) return gamePaused ? 'none' : 'pause';
  if (['GameOver', 'Shop', 'Achievements', 'Tuning'].some((k) => activeSceneKeys.includes(k))) return 'menu';
  if (activeSceneKeys.includes('Menu')) return 'exit';
  return 'none';
}
