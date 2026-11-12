import * as Phaser from 'phaser';
import { browserStorage, recordResult } from '../systems/HighScore.js';
import { formatTime } from '../systems/Format.js';
import { enqueueResult, fetchTop, flush, statusLine } from '../systems/Leaderboard.js';
import { LEADERBOARD_URL, REQUEST_TIMEOUT_MS } from '../config/leaderboard.js';
import { leaderboard, leaderboardOpen } from '../leaderboard/index.js';

// Захист від випадкового тапу: гравець міг тапати для стрибка в момент смерті
const INPUT_DELAY_MS = 600;

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ score = 0, timeSec = 0, steps = 0, totalSteps = 0, height: climb = 0, eligible = false } = {}) {
    // зміна розміру екрана → перебудувати екран
    const onResize = () => this.scene.restart(this.sys.settings.data);
    this.scale.once(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
    const { width, height } = this.scale;
    // рекорд записуємо один раз; при перебудові екрана (resize) беремо збережений результат
    const data = this.sys.settings.data ?? {};
    data.result ??= recordResult(browserStorage(), score);
    const { best, isNewRecord: isRecord } = data.result;
    // таблиця лідерів (етап 12): у чергу — один раз, навіть якщо екран перебудовується (resize)
    const storage = browserStorage();
    if (!data.lb) {
      data.lb = { eligible: eligible && Boolean(LEADERBOARD_URL), result: null };
      if (data.lb.eligible) enqueueResult(storage, { height: climb, timeSec });
    }
    const cx = width / 2;
    const style = (size, color = '#ffffff') => ({ fontFamily: 'sans-serif', fontSize: `${size}px`, color, align: 'center' });

    this.add.text(cx, height * 0.3, 'GAME OVER', style(80, '#ff5c5c')).setOrigin(0.5);
    this.add.text(cx, height * 0.42, `SCORE ${score}`, style(56)).setOrigin(0.5);
    this.add.text(cx, height * 0.48, `час ${formatTime(timeSec)} · висота ${climb}`, style(36, '#cccccc')).setOrigin(0.5);
    this.add
      .text(cx, height * 0.56, isRecord ? 'Новий рекорд!' : `Рекорд ${best}`, style(44, isRecord ? '#ffd84a' : '#ffffff'))
      .setOrigin(0.5);
    this.add.text(cx, height * 0.63, `+${steps} Шагів · усього ${totalSteps}`, style(36, '#ffd84a')).setOrigin(0.5);
    // без адреси сервера рядка немає зовсім; «Не Норма» — лише коли таблиця підключена
    const lbLine = this.add
      .text(cx, height * 0.69, '', { ...style(32, '#9cff57'), padding: { x: 16, y: 8 } })
      .setOrigin(0.5);
    const showStatus = () => {
      const lb = data.lb;
      const text = LEADERBOARD_URL ? statusLine({ eligible, result: lb.eligible ? lb.result : undefined }) : '';
      lbLine.setText(text).setColor(lb.result?.status === 'sent' ? '#9cff57' : '#cccccc');
      // без ніка рядок відкриває «Лідери» з полем ніка
      if (lb.result?.status === 'nonick') lbLine.setInteractive({ useHandCursor: true }).setBackgroundColor('#00000066');
      else lbLine.disableInteractive().setBackgroundColor('transparent');
    };
    showStatus();
    // Асинхронні відповіді малюють через this.lbShow — він завжди від поточного create (після resize — новий
    // рядок). Відповідь для іншого забігу (новий GameOver з іншими data) нічого не чіпає.
    this.lbShow = showStatus;
    const net = { url: LEADERBOARD_URL, timeoutMs: REQUEST_TIMEOUT_MS };
    const send = (task) => {
      if (data.lb.inFlight) return; // resize під час відправки не має слати вдруге
      data.lb.inFlight = task().then((r) => {
        data.lb.result = r;
        data.lb.inFlight = null;
        if (this.sys.isActive() && this.sys.settings.data === data) this.lbShow();
      });
    };
    if (data.lb.eligible && !data.lb.result) send(() => flush(storage, net));
    const hint = this.add.text(cx, height * 0.76, 'Тапни, щоб грати ще', style(40)).setOrigin(0.5).setAlpha(0);
    const menuBtn = this.add
      .text(cx, height * 0.86, 'Меню', { ...style(36, '#cfe8cf'), backgroundColor: '#00000066', padding: { x: 32, y: 12 } })
      .setOrigin(0.5)
      .setAlpha(0);

    this.time.delayedCall(INPUT_DELAY_MS, () => {
      hint.setAlpha(1);
      menuBtn.setAlpha(1).setInteractive({ useHandCursor: true });
      // магазин і досягнення — у меню, тож туди треба потрапити без системної кнопки «Назад»
      let leaving = false;
      this.input.on('pointerdown', (pointer, over) => {
        if (leaving || leaderboardOpen()) return;
        if (over.includes(lbLine) && data.lb.result?.status === 'nonick') {
          // після збереження ніка — одразу ще раз надіслати результат
          leaderboard().open({
            focusNick: true,
            closed: () => send(async () => {
              const r = await flush(storage, net);
              if (r.status !== 'empty') return r;
              // шар «Лідери» міг уже надіслати результат сам — тоді місце беремо з таблиці
              const t = await fetchTop(storage, net);
              return t.status === 'ok' && t.me ? { status: 'sent', rank: t.me.rank } : { status: 'offline' };
            }),
          });
          return;
        }
        leaving = true;
        this.scene.start(over.includes(menuBtn) ? 'Menu' : 'Game');
      });
    });
  }
}
