// Один шар «Лідери» на застосунок: створюється при першому відкритті (як src/codex/index.js).
import { createLeaderboard } from './LeaderboardOverlay.js';

let instance = null;
export function leaderboard() {
  instance ??= createLeaderboard();
  return instance;
}
export const leaderboardOpen = () => Boolean(instance?.isOpen());
