// Контур посиленого ворога (етап 11, §11.1): замість зірочки. Чисті функції без Phaser.
import { BALANCE } from '../config/balance.js';

const O = BALANCE.traits.outline;

/** Колір контуру: у лаві — холодний, щоб не зливався з червоним фоном. */
export function outlineColor(biome) {
  return biome === 'lava' ? O.lavaColor : O.color;
}

/** Прозорість контуру в момент tMs: косинусний пульс від alphaMin до alphaMax і назад за pulseMs. */
export function outlineAlpha(tMs) {
  const k = (1 - Math.cos((2 * Math.PI * tMs) / O.pulseMs)) / 2;
  return O.alphaMin + (O.alphaMax - O.alphaMin) * k;
}
