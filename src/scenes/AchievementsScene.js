import * as Phaser from 'phaser';
import { browserStorage } from '../systems/HighScore.js';
import { achievementList, claimAchievement, loadMeta, saveMeta } from '../systems/Meta.js';
import { sfx } from '../systems/Audio.js';
import { backButton, button, rebuildOnResize, textStyle } from './ui.js';

const ROW_H = 150;
const PAD_X = 50;

/** Досягнення: неотримані — «???» без опису; отримані — назва, підпис, кнопка «Забрати +N». */
export default class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('Achievements');
  }

  create() {
    rebuildOnResize(this, Phaser);
    this.storage = browserStorage();
    this.meta = loadMeta(this.storage);
    this.draw();
  }

  draw() {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add.text(cx, height * 0.06, 'Досягнення', textStyle(64, '#9cff57')).setOrigin(0.5);
    this.add.text(cx, height * 0.12, `Шаги: ${this.meta.steps}`, textStyle(40, '#ffd84a')).setOrigin(0.5);

    const top = height * 0.2;
    const textW = width - 2 * PAD_X - 230;
    achievementList(this.meta).forEach((a, i) => {
      const y = top + i * ROW_H;
      this.add.rectangle(cx, y, width - 60, ROW_H - 14, 0x000000, a.hidden ? 0.25 : 0.45);
      const left = (txt, dy, st) => this.add.text(PAD_X, y + dy, txt, { ...st, align: 'left', wordWrap: { width: textW } }).setOrigin(0, 0.5);
      if (a.hidden) {
        left('???', 0, textStyle(40, '#6a6a6a'));
        return;
      }
      left(a.title, -24, textStyle(32));
      left(a.caption, 24, { ...textStyle(24, '#bdbdbd'), fontStyle: 'italic' });
      const bx = width - 150;
      if (a.claimed) this.add.text(bx, y, 'Забрано', textStyle(28, '#6a9a6a')).setOrigin(0.5);
      else button(this, bx, y, `Забрати\n+${a.reward}`, () => this.claim(a.id), '#ffd84a', 28);
    });
    backButton(this);
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
