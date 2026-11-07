import { BALANCE } from '../config/balance.js';

const DEPTH = 5;
const HOLD_DX = 22; // наскільки зброя в руках зсунута від центру слизака в бік екрана
const HOLD_DY = 6;
const ORBIT = 0.72; // сокира під час розмаху летить по колу на цій частці радіуса
const VEIN_PULSE_MS = 420;
const HOLD_SCALE = { axe: 1.3, shotgun: 1.15 }; // у руках трохи більші за полотно, щоб їх було видно на телефоні

/**
 * Як виглядає основна зброя на слизакові: сокира чи дробовик у руках, вени чакри на тілі,
 * розмах сокири. Лише картинка — шкоду рахує GameScene. Оновлюється щокадру з update().
 */
export default class WeaponView {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.main = null;
    this.swinging = false;
    this.held = scene.add.image(0, 0, 'axe').setDepth(DEPTH).setVisible(false);
    this.veins = scene.add.image(0, 0, 'chakraVeins').setDepth(DEPTH).setVisible(false);
    this.ring = scene.add.graphics().setDepth(DEPTH - 1);
  }

  setMain(main) {
    this.main = main;
    const tex = main === 'axe' ? 'axe' : main === 'shotgun' ? 'shotgun' : null;
    this.held.setVisible(Boolean(tex));
    if (tex) this.held.setTexture(tex).setScale(HOLD_SCALE[tex]);
    this.veins.setVisible(main === 'chakra');
    this.scene.tweens.killTweensOf(this.veins);
    if (main === 'chakra') {
      this.veins.setAlpha(1);
      this.scene.tweens.add({ targets: this.veins, alpha: 0.45, duration: VEIN_PULSE_MS, yoyo: true, repeat: -1 });
    }
    this.update();
  }

  /** Напрямок у бік екрана: з лівої стіни — вправо. */
  get dir() {
    return this.player.side === 'left' ? 1 : -1;
  }

  update() {
    const p = this.player;
    this.veins.setPosition(p.x, p.y).setFlipX(p.flipX);
    if (this.swinging) return;
    this.held
      .setPosition(p.x + this.dir * HOLD_DX, p.y + HOLD_DY)
      .setFlipX(this.dir < 0)
      .setRotation(this.main === 'axe' ? this.dir * 0.35 : 0);
  }

  /** Постріл дробовика: ствол дивиться в ціль. */
  aim(angle) {
    if (this.main !== 'shotgun') return;
    // текстура дивиться вправо; ліворуч — віддзеркалюємо, щоб приклад не був догори
    const left = Math.cos(angle) < 0;
    this.held.setFlipX(left).setRotation(left ? angle - Math.PI : angle);
  }

  /** Розмах сокири по колу радіуса radius + кільце зони удару. */
  swing(radius) {
    const p = this.player;
    this.swinging = true;
    const start = this.dir > 0 ? 0 : Math.PI;
    const turn = this.dir * Math.PI * 2;
    const ms = BALANCE.weapons.axe.swingMs;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      onUpdate: (tw) => {
        const a = start + turn * tw.getValue();
        this.held
          .setPosition(p.x + Math.cos(a) * radius * ORBIT, p.y + Math.sin(a) * radius * ORBIT)
          .setRotation(a + Math.PI / 2)
          .setScale(1.6);
        this.drawRing(radius, 1 - tw.getValue());
      },
      onComplete: () => {
        this.swinging = false;
        this.held.setScale(HOLD_SCALE.axe);
        this.ring.clear();
        this.update();
      },
    });
  }

  drawRing(radius, k) {
    const p = this.player;
    this.ring.clear();
    this.ring.lineStyle(6, 0xd8e2e6, 0.55 * k).strokeCircle(p.x, p.y, radius);
    this.ring.fillStyle(0xd8e2e6, 0.12 * k).fillCircle(p.x, p.y, radius);
  }
}
