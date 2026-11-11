// Один шар довідника на застосунок: створюється при першому відкритті.
import { createCodex } from './CodexOverlay.js';

let instance = null;
export function codex() {
  instance ??= createCodex();
  return instance;
}
export const codexOpen = () => Boolean(instance?.isOpen());
