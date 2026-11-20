// Один шар «Що нового» на застосунок: створюється при першому відкритті (як src/codex/index.js).
import { createPatchNotes } from './PatchNotesOverlay.js';

let instance = null;
export function patchNotes() {
  instance ??= createPatchNotes();
  return instance;
}
export const patchNotesOpen = () => Boolean(instance?.isOpen());
