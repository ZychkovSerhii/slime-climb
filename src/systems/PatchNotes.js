import { PATCH_NOTES } from '../config/patchNotes.js';

const KEY = 'slime-climb.patchNotesSeen';

/** id найновішого патчноуту або null. */
export function latestId(notes = PATCH_NOTES) {
  return notes[0]?.id ?? null;
}

/** Показати вікно? Так, якщо найновіший запис ще не бачили на цьому пристрої (і при першій установці теж). */
export function shouldShowPatchNotes(storage, notes = PATCH_NOTES) {
  const id = latestId(notes);
  if (!id) return false;
  try {
    return storage?.getItem(KEY) !== id;
  } catch {
    return false; // сховище недоступне — не набридаємо вікном щоразу
  }
}

export function markPatchNotesSeen(storage, notes = PATCH_NOTES) {
  const id = latestId(notes);
  if (!id) return;
  try {
    storage?.setItem(KEY, id);
  } catch {
    /* сховище недоступне — нічого */
  }
}
