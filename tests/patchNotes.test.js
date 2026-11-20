import { expect, test } from 'vitest';
import { PATCH_NOTES } from '../src/config/patchNotes.js';
import { latestId, markPatchNotesSeen, shouldShowPatchNotes } from '../src/systems/PatchNotes.js';
import { backAction } from '../src/systems/Navigation.js';

const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('патчноут: показується, доки найновіший не побачено; новий запис — знову', () => {
  const st = mem();
  expect(shouldShowPatchNotes(st)).toBe(true);
  markPatchNotesSeen(st);
  expect(shouldShowPatchNotes(st)).toBe(false);
  const next = [{ id: 'next', title: 't', items: ['x'] }, ...PATCH_NOTES];
  expect(shouldShowPatchNotes(st, next)).toBe(true);
});

test('патчноут: id унікальні, у кожного запису є пункти', () => {
  const ids = PATCH_NOTES.map((n) => n.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(latestId()).toBe(ids[0]);
  for (const n of PATCH_NOTES) expect(n.items.length).toBeGreaterThan(0);
});

test('патчноут: зламане сховище не ламає меню', () => {
  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  expect(shouldShowPatchNotes(bad)).toBe(false);
  expect(() => markPatchNotesSeen(bad)).not.toThrow();
});

test('«Назад» спершу закриває «Що нового»', () => {
  expect(backAction(['Menu'], false, false, false, true)).toBe('closePatchNotes');
});
