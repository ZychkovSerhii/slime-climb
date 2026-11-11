import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import PlantBullet from './PlantBullet.js';
import { animKey } from '../art/sprites/index.js';
import { plantMayFire } from '../systems/Targeting.js';

const CFG = BALANCE.enemies.plant;
const WINDUP_TINT = 0xfff07a;

/**
 * Рослина: сидить на стіні, їде разом зі світом і стріляє кулею в гравця.
 * Фідбек-2:
 * - стріляє лише коли на екрані і вище за гравця на minAbovePx — траєкторія крута, від кулі рятує стрибок
 *   (раніше квітка на рівні гравця з протилежної стіни стріляла горизонтально — стрибок летів прямо в кулю);
 * - перед пострілом windupMs блимає жовтим (попередження);
 * - таймер іде лише на екрані: перший постріл — firstShotMs після появи, далі раз на fireMs.
 */
export default class Plant extends Enemy {
  /** y — центр на стіні (за замовчуванням над верхнім краєм екрана). */
  constructor(scene, side, y) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('plant');
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, y ?? -tex.height / 2, 'plant', 'plant');
    this.side = side;
    this.scrollsWithWorld = true;
    if (side === 'right') this.setFlipX(true);
    this.nextFireAt = null; // заведеться, коли квітка з'явиться на екрані
    this.windupAt = null;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const now = scene.nowMs; // час гри стоїть на паузі — квітка не «накопичує» постріли
    const mul = Math.max(this.speedMul(now), 0.25); // приклеєна павутиною — не «замерзає» назавжди
    const may = this.isOnScreen() && plantMayFire(this.y, scene.player.y);
    if (!may) {
      if (this.windupAt !== null) this.cancelWindup();
      if (this.nextFireAt !== null) this.nextFireAt = Math.max(this.nextFireAt, now + CFG.firstShotMs / mul);
      return;
    }
    if (this.nextFireAt === null) this.nextFireAt = now + CFG.firstShotMs / mul;
    if (this.windupAt === null) {
      if (now < this.nextFireAt - CFG.windupMs) return;
      this.windupAt = now;
      this.setTint(WINDUP_TINT);
      this.windupTween = scene.tweens.add({ targets: this, scaleX: 1.15, scaleY: 0.9, duration: CFG.windupMs / 2, yoyo: true });
      return;
    }
    if (now < this.nextFireAt) return;
    this.cancelWindup();
    this.nextFireAt = now + CFG.fireMs / mul;
    this.play(animKey('plant', 'shoot'));
    this.chain(animKey('plant', 'idle'));
    const bullet = new PlantBullet(scene, this.x, this.y);
    scene.enemyProjectiles.add(bullet);
    bullet.launch(scene.player.x, scene.player.y, CFG.bulletSpeed);
  }

  cancelWindup() {
    this.windupAt = null;
    this.windupTween?.stop();
    this.setScale(1);
    this.tintedSlow = undefined; // відтінок перерахує Enemy
    this.clearTint();
  }
}
