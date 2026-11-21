import { BALANCE } from '../config/balance.js';
import { dayNight } from '../systems/Grass.js';

const N = BALANCE.grass.night;
const SKY_Y = 230; // висота дуги сонця: нижче HUD (серця, досвід, рахунок)
const ARC_PX = 50;

/**
 * День → ніч трави (біом 5, systems/Grass.dayNight): сонце йде зліва направо над коридором, потім місяць і ніч.
 * Темний шар — над фоном і стінами (глибини −3 / −1), але під ворогами, кулями й кущами (глибина 0+):
 * ніч міняє настрій, а загрози видно (рішення Claude). startMs — коли почався біом (мс гри).
 */
export default class DayNight {
  constructor(scene, startMs) {
    this.scene = scene;
    this.startMs = startMs;
    const { width, height } = scene.scale;
    this.sun = scene.add.image(0, SKY_Y, 'sun').setDepth(-2);
    this.moon = scene.add.image(width / 2, SKY_Y, 'moon').setDepth(-0.4).setAlpha(0);
    this.shade = scene.add.rectangle(width / 2, height / 2, width, height, N.color, 0).setDepth(-0.5);
    this.step();
  }

  step() {
    const scene = this.scene;
    const { width } = scene.scale;
    const d = dayNight(scene.nowMs - this.startMs);
    const w = BALANCE.wallWidth + 40;
    if (d.sunT !== null) {
      this.sun.setVisible(true).setPosition(w + (width - 2 * w) * d.sunT, SKY_Y - ARC_PX * Math.sin(Math.PI * d.sunT));
    } else this.sun.setVisible(false);
    this.moon.setAlpha(d.moon ? Math.min(d.dark / N.alpha, 1) : 0);
    this.shade.setFillStyle(N.color, d.dark);
  }

  get dark() {
    return this.shade.fillAlpha;
  }

  relayout() {
    const { width, height } = this.scene.scale;
    this.shade.setSize(width, height).setPosition(width / 2, height / 2);
    this.moon.setX(width / 2);
  }

  destroy() {
    this.sun.destroy();
    this.moon.destroy();
    this.shade.destroy();
  }
}
