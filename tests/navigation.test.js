import { expect, test } from 'vitest';
import { backAction } from '../src/systems/Navigation.js';

test('back during a run pauses instead of quitting', () => {
  expect(backAction(['Game', 'Hud'], false)).toBe('pause');
});
test('back while already paused (or choosing a card) does nothing', () => {
  expect(backAction(['Game', 'Hud'], true)).toBe('none');
  expect(backAction(['Game', 'Hud', 'LevelUp'], true)).toBe('none');
});
test('back on GameOver goes to the menu', () => expect(backAction(['GameOver'], false)).toBe('menu'));
test('back on the menu exits the app', () => expect(backAction(['Menu'], false)).toBe('exit'));
test('back during boot does nothing', () => expect(backAction(['Boot'], false)).toBe('none'));
test('back in the shop or achievements goes to the menu', () => {
  expect(backAction(['Shop'], false)).toBe('menu');
  expect(backAction(['Achievements'], false)).toBe('menu');
});
test('back with the codex open closes it instead of quitting', () => {
  expect(backAction(['Menu'], false, true)).toBe('closeCodex');
});

test('«Назад» закриває шар «Лідери» (етап 12), довідник — першим', () => {
  expect(backAction(['Menu'], false, false, true)).toBe('closeLeaderboard');
  expect(backAction(['GameOver'], false, false, true)).toBe('closeLeaderboard');
  expect(backAction(['Menu'], false, true, true)).toBe('closeCodex');
  expect(backAction(['Menu'], false, false, false)).toBe('exit');
});
