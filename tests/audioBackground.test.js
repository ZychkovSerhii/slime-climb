// Баг 2026-11-20: музика грає при вимкненому екрані. Приспати звук уміла лише сцена гри (PauseController),
// а в меню, магазині, GAME OVER і досягненнях AudioContext ніхто не зупиняв. Тепер це робить сам Audio.js
// (setAppBackground, його кличуть visibilitychange і Capacitor App pause/resume).
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

function param() {
  return { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
}
function node(extra = {}) {
  return { connect(n) { return n ?? this; }, disconnect() {}, start() {}, stop() {}, ...extra };
}
class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = node();
  }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() { return node({ gain: param() }); }
  createOscillator() { return node({ frequency: param(), type: 'square' }); }
  createBufferSource() { return node({ buffer: null }); }
  createBuffer(_ch, n) { return { getChannelData: () => new Float32Array(n) }; }
}

let A;
beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  globalThis.AudioContext = FakeAudioContext;
  // у vitest немає DOM: Audio.js при імпорті вішає слухачі на document — даємо мінімальний
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  A = await import('../src/systems/Audio.js');
});
afterEach(() => {
  A.stopMusic();
  delete globalThis.AudioContext;
  delete globalThis.document;
  vi.useRealTimers();
});

describe('звук у фоні (екран вимкнено / застосунок згорнуто)', () => {
  test('у меню: фон приспає музику, повернення будить', () => {
    A.playMusic('menu');
    expect(A.audioState()).toBe('running');
    A.setAppBackground(true);
    expect(A.audioState()).toBe('suspended');
    A.setAppBackground(false);
    expect(A.audioState()).toBe('running');
  });

  test('у фоні ні ефект, ні новий трек не будять звук', () => {
    A.playMusic('menu');
    A.setAppBackground(true);
    A.sfx('jump');
    A.playMusic('cave');
    expect(A.audioState()).toBe('suspended');
  });

  test('у фоні дотик не будить звук', () => {
    A.playMusic('menu');
    A.setAppBackground(true);
    document.dispatchEvent(new Event('pointerdown'));
    expect(A.audioState()).toBe('suspended');
  });

  test('гра на паузі: повернення з фону не будить звук до «Продовжити»', () => {
    A.playMusic('cave');
    A.setAppBackground(true);
    A.suspendAudio(); // PauseController.openOverlay на згортання
    A.setAppBackground(false);
    expect(A.audioState()).toBe('suspended');
    A.resumeAudio(); // «Продовжити»
    expect(A.audioState()).toBe('running');
  });

  test('visibilitychange сам перемикає фон', () => {
    A.playMusic('menu');
    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(A.audioState()).toBe('suspended');
    document.hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(A.audioState()).toBe('running');
  });
});
