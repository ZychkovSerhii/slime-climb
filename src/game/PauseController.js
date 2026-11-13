import { BALANCE } from '../config/balance.js';
import { resumeAudio, stopMusic, suspendAudio } from '../systems/Audio.js';
import { recordResult } from '../systems/HighScore.js';

const MENU_LABEL = 'У меню';
const MENU_CONFIRM = 'Точно вийти?';
const MENU_DY = 150; // кнопка «У меню» нижче «Продовжити»

/**
 * Пауза забігу: оверлей «Продовжити» / «У меню», згортання вкладки, вихід у меню.
 * Сам прапорець лишається в scene.paused — його читають сутності й HUD.
 * Від сцени бере: paused, dead, score, storage, levelUpOpen, introOpen, inputBlockedUntil.
 */
export default class PauseController {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    // «У меню» (відгук після етапу 10): закінчити забіг з паузи. Перший тап перепитує — щоб випадковий не губив забіг.
    this.menuBtn = scene.add
      .text(width / 2, height / 2 + MENU_DY, MENU_LABEL, {
        fontFamily: 'sans-serif',
        fontSize: '44px',
        color: '#cfe8cf',
        backgroundColor: '#000000aa',
        padding: { x: 32, y: 18 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.menuBtn.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation?.();
      if (this.menuBtn.text === MENU_LABEL) {
        this.menuBtn.setText(MENU_CONFIRM).setColor('#ffd84a');
        return;
      }
      this.quitToMenu();
    });
    this.overlay = scene.add
      .text(width / 2, height / 2, 'Продовжити', {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 40, y: 24 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.overlay.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation?.();
      this.overlay.setVisible(false);
      this.menuBtn.setVisible(false);
      resumeAudio();
      scene.inputBlockedUntil = scene.game.loop.time + BALANCE.tapGuardMs;
      // під час вибору картки чи представлення боса гра лишається на паузі, доки вони відкриті
      if (!scene.levelUpOpen && !scene.introOpen) this.set(false);
    });
  }

  /** Чи відкрито оверлей «Продовжити» (застосунок згортали). */
  get overlayOpen() {
    return this.overlay.visible;
  }

  /** Згортання вкладки/застосунку ставить паузу з оверлеєм; відписка — на SHUTDOWN сцени. */
  watchVisibility() {
    const onVisibility = () => {
      if (document.hidden) this.openOverlay();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.scene.events.once('shutdown', () => document.removeEventListener('visibilitychange', onVisibility));
  }

  /** Пауза з кнопкою «Продовжити» (згортання застосунку / вкладки, кнопка паузи). */
  openOverlay() {
    this.set(true);
    suspendAudio();
    this.overlay.setVisible(true);
    this.menuBtn.setVisible(true).setText(MENU_LABEL).setColor('#cfe8cf');
  }

  /** Закінчити забіг з паузи: рекорд зберігається (Шаги й лічильники вже записані при вбивствах), далі — меню. */
  quitToMenu() {
    const scene = this.scene;
    // уже мертвий (GAME OVER не відкрився) — усе одно виходимо: «У меню» не має бути глухим кутом (фідбек-6)
    if (!scene.dead) recordResult(scene.storage, scene.score);
    scene.dead = true;
    stopMusic();
    resumeAudio();
    for (const key of ['Hud', 'LevelUp', 'BossIntro']) scene.scene.stop(key);
    scene.scene.start('Menu');
  }

  /** Ставить/знімає паузу фізики, таймерів, твінів і логіки update. */
  set(paused) {
    const scene = this.scene;
    scene.paused = paused;
    if (paused) {
      scene.physics.pause();
      scene.tweens.pauseAll();
      scene.anims.pauseAll();
    } else {
      scene.physics.resume();
      scene.tweens.resumeAll();
      scene.anims.resumeAll();
    }
    scene.time.paused = paused;
  }

  relayout() {
    const { width, height } = this.scene.scale;
    this.overlay.setPosition(width / 2, height / 2);
    this.menuBtn.setPosition(width / 2, height / 2 + MENU_DY);
  }
}
