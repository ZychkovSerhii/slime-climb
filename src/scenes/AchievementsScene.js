import * as Phaser from 'phaser';
import { browserStorage } from '../systems/HighScore.js';
import { achievementList, claimAchievement, loadMeta, saveMeta } from '../systems/Meta.js';
import { clampScroll, isDrag } from '../systems/ScrollList.js';
import { sfx } from '../systems/Audio.js';
import { backButton, rebuildOnResize, textStyle } from './ui.js';

const ROW_H = 150;
const PAD_X = 50;
const WHEEL_STEP = 0.6;

/**
 * Досягнення: неотримані — «???» без опису; отримані — назва, підпис, кнопка «Забрати +N».
 * Список довший за екран: прокрутка пальцем і колесом. Рядки малює окрема камера `listCam`
 * з вікном між заголовком і «Назад» — вона й обрізає список. «Забрати» спрацьовує на відпусканні
 * і лише якщо палець не протягував список.
 */
export default class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('Achievements');
  }

  create() {
    rebuildOnResize(this, Phaser);
    this.storage = browserStorage();
    this.meta = loadMeta(this.storage);
    this.scroll = 0;
    this.drag = null;
    const { width, height } = this.scale;
    this.view = { top: Math.round(height * 0.17), bottom: Math.round(height * 0.86) };
    this.view.h = this.view.bottom - this.view.top;
    this.listCam = this.cameras.add(0, this.view.top, width, this.view.h);
    this.bindScroll();
    this.draw();
  }

  draw() {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const cx = width / 2;
    const fixed = [
      this.add.text(cx, height * 0.06, 'Досягнення', textStyle(64, '#9cff57')).setOrigin(0.5),
      this.add.text(cx, height * 0.12, `Шаги: ${this.meta.steps}`, textStyle(40, '#ffd84a')).setOrigin(0.5),
    ];

    const list = [];
    const add = (obj) => (list.push(obj), obj);
    const textW = width - 2 * PAD_X - 230;
    const rows = achievementList(this.meta);
    rows.forEach((a, i) => {
      const y = ROW_H / 2 + i * ROW_H;
      add(this.add.rectangle(cx, y, width - 60, ROW_H - 14, 0x000000, a.hidden ? 0.25 : 0.45));
      const left = (txt, dy, st) => add(this.add.text(PAD_X, y + dy, txt, { ...st, align: 'left', wordWrap: { width: textW } }).setOrigin(0, 0.5));
      if (a.hidden) {
        left('???', 0, textStyle(40, '#6a6a6a'));
        return;
      }
      left(a.title, -24, textStyle(32));
      left(a.caption, 24, { ...textStyle(24, '#bdbdbd'), fontStyle: 'italic' });
      const bx = width - 150;
      if (a.claimed) add(this.add.text(bx, y, 'Забрано', textStyle(28, '#6a9a6a')).setOrigin(0.5));
      else add(this.claimButton(bx, y, a));
    });
    this.contentH = rows.length * ROW_H;
    fixed.push(backButton(this));

    this.cameras.main.ignore(list);
    this.listCam.ignore(fixed);
    this.setScroll(this.scroll);
  }

  claimButton(x, y, a) {
    const b = this.add
      .text(x, y, `Забрати\n+${a.reward}`, { ...textStyle(28, '#ffd84a'), backgroundColor: '#00000066', padding: { x: 24, y: 12 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.on('pointerup', (p) => {
      if (this.drag?.moved || !this.inView(p.y)) return;
      this.claim(a.id);
    });
    return b;
  }

  bindScroll() {
    this.input.on('pointerdown', (p) => {
      if (this.inView(p.y)) this.drag = { downY: p.y, startScroll: this.scroll, moved: false };
    });
    this.input.on('pointermove', (p) => {
      if (!this.drag || !p.isDown) return;
      if (isDrag(this.drag.downY, p.y)) this.drag.moved = true;
      if (this.drag.moved) this.setScroll(this.drag.startScroll + (this.drag.downY - p.y));
    });
    // Обнуляємо після кнопок (вони теж слухають pointerup), тому — на наступному кроці.
    this.input.on('pointerup', () => this.time.delayedCall(0, () => (this.drag = null)));
    this.input.on('wheel', (_p, _o, _dx, dy) => this.setScroll(this.scroll + dy * WHEEL_STEP));
  }

  inView(y) {
    return y >= this.view.top && y <= this.view.bottom;
  }

  setScroll(v) {
    this.scroll = clampScroll(v, this.contentH ?? 0, this.view.h);
    this.listCam.scrollY = this.scroll;
  }

  claim(id) {
    const r = claimAchievement(this.meta, id);
    if (r.reward <= 0) return;
    sfx('levelUp');
    this.meta = r.meta;
    saveMeta(this.storage, r.meta);
    this.draw();
  }
}
