import { BALANCE } from '../config/balance.js';
import Enemy from './Enemy.js';
import PlantBullet from './PlantBullet.js';

const CFG = BALANCE.enemies.plant;

/** Рослина: сидить на стіні, їде разом зі світом, раз на fireMs стріляє кулею в гравця (поки видно на екрані). */
export default class Plant extends Enemy {
  constructor(scene, side) {
    const { width } = scene.scale;
    const tex = scene.textures.get('plant').getSourceImage();
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, -tex.height / 2, 'plant', 'plant');
    this.side = side;
    this.scrollsWithWorld = true;
    if (side === 'right') this.setFlipX(true);
    this.nextFireAt = scene.nowMs + CFG.fireMs;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    // час гри (nowMs) стоїть на паузі — рослина не «накопичує» постріли
    if (scene.nowMs < this.nextFireAt) return;
    this.nextFireAt = scene.nowMs + CFG.fireMs / this.speedMul(scene.nowMs);
    if (!this.isOnScreen()) return;
    const bullet = new PlantBullet(scene, this.x, this.y);
    scene.enemyProjectiles.add(bullet);
    bullet.launch(scene.player.x, scene.player.y, CFG.bulletSpeed);
  }
}
