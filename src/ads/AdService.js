import { AD_MODE } from '../config/ads.js';
import { adBannerRect } from '../systems/Layout.js';

// Єдина точка реклами (фідбек-7). Зараз — заглушка; реальний SDK (AdMob) замінить лише цей файл.
// Режим 'off' (config/ads.js) вимикає все: нічого не малюється, нагороди немає.

const DEPTH = 2000;
const STUB_COUNTDOWN_S = 3;
const textStyle = (size, color = '#ffffff') => ({ fontFamily: 'sans-serif', fontSize: `${size}px`, color, align: 'center' });

/** Заглушка банера внизу екрана. Повертає { destroy() } або null (режим off). */
export function showBanner(scene) {
  const r = adBannerRect(scene.scale.width, scene.scale.height, AD_MODE);
  if (!r) return null;
  const box = scene.add.rectangle(r.x, r.y, r.w, r.h, 0x444444, 0.9).setDepth(DEPTH).setScrollFactor(0);
  const label = scene.add.text(r.x, r.y, 'РЕКЛАМА (заглушка банера)', textStyle(28, '#cccccc')).setOrigin(0.5).setDepth(DEPTH).setScrollFactor(0);
  return { destroy: () => { box.destroy(); label.destroy(); } };
}

/**
 * Заглушка ролика із нагородою: затемнення, відлік 3 с, потім «Закрити». Закрити раніше неможливо (кнопки немає).
 * Проміс: true — доглянули і закрили; false — реклама вимкнена або сцену перебудували, не догледівши.
 */
export function showRewarded(scene) {
  if (AD_MODE === 'off') return Promise.resolve(false);
  return new Promise((resolve) => {
    const { width, height } = scene.scale;
    const cx = width / 2;
    const parts = [];
    const dim = scene.add.rectangle(cx, height / 2, width, height, 0x000000, 0.9).setDepth(DEPTH + 1).setInteractive();
    const title = scene.add.text(cx, height * 0.4, 'РЕКЛАМА (заглушка)', textStyle(48)).setOrigin(0.5).setDepth(DEPTH + 2);
    const info = scene.add.text(cx, height * 0.5, '', textStyle(36, '#ffd84a')).setOrigin(0.5).setDepth(DEPTH + 2);
    parts.push(dim, title, info);
    let left = STUB_COUNTDOWN_S;
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      timer.remove(false);
      parts.forEach((p) => p.destroy());
      resolve(ok);
    };
    const tick = () => {
      if (done) return;
      if (left > 0) {
        info.setText(`Ролик іде… ${left} с`);
        left -= 1;
        return;
      }
      info.setText('Готово!');
      const close = scene.add
        .text(cx, height * 0.62, 'Закрити', { ...textStyle(40, '#9cff57'), backgroundColor: '#ffffff22', padding: { x: 32, y: 14 } })
        .setOrigin(0.5).setDepth(DEPTH + 2).setInteractive({ useHandCursor: true });
      parts.push(close);
      close.once('pointerdown', () => finish(true));
      timer.remove(false);
    };
    const timer = scene.time.addEvent({ delay: 1000, loop: true, callback: tick });
    tick();
    scene.events.once('shutdown', () => finish(false)); // перебудова екрана посеред ролика — нагороди немає
  });
}
