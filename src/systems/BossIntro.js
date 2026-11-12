// Представлення босів (етап 9, §9.3): що показати і коли закривати. Без Phaser.
import { BALANCE } from '../config/balance.js';

const I = BALANCE.bossIntro;

// sprite — ключ спрайта, frame — індекс кадру в стрічці (бойова поза), scale — розмір на екрані
const INFO = {
  spider: { name: BALANCE.boss.name, sprite: 'spider', frame: 0, scale: 2.4, music: 'introSpider' },
  shkodko: { name: BALANCE.shkodko.name, sprite: 'shkodko', frame: 0, scale: 3.6, music: 'introShkodko' },
  kolya: { name: BALANCE.kolya.name, sprite: 'kolya', frame: 0, scale: 2.6, music: 'introKolya' },
  bear: { name: BALANCE.bearBoss.name, sprite: 'bear', frame: 2, scale: 3.4, music: 'introBear' }, // етап 10, кадр rear
  kazan: { name: BALANCE.kazan.name, sprite: 'kazan', frame: 3, scale: 2.6, music: 'introKazan' }, // етап 11, кадр boil
};

export const INTRO_BOSSES = Object.keys(INFO);

/** Дані для сцени представлення: { name, subtitle, sprite, frame, scale, music }. loop — номер кола з 0. */
export function bossIntroInfo(boss, loop = 0) {
  return { ...INFO[boss], subtitle: `Коло ${loop + 1}` };
}

/** Дотик пропускає представлення лише після skipMs (інакше тап «стрибка» його проскакував би наосліп). */
export function introCanSkip(elapsedMs) {
  return elapsedMs >= I.skipMs;
}

export function introDone(elapsedMs) {
  return elapsedMs >= I.autoCloseMs;
}
