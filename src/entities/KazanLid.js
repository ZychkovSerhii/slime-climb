import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { lidPath } from '../systems/KazanPlanner.js';

const L = BALANCE.kazan.lid;

/**
 * Кришка-бумеранг Казана (етап 11, §11.3): летить через коридор на висоті y від стіни fromSide до протилежної
 * і назад тим самим шляхом за flightMs (KazanPlanner.lidPath), обертаючись. Група enemyProjectiles: дотик — мінус життя.
 */
export default class KazanLid extends Phaser.Physics.Arcade.Image {
  constructor(scene, fromSide, y) {
    const w = BALANCE.wallWidth;
    const { width } = scene.scale;
    const half = scene.textures.getFrame('lid').width / 2;
    const left = w + half;
    const right = width - w - half;
    super(scene, fromSide === 'left' ? left : right, y, 'lid');
    scene.add.existing(this);
    this.type = 'lid';
    this.scrollsWithWorld = false;
    this.startX = this.x;
    this.endX = fromSide === 'left' ? right : left;
    this.bornAt = scene.nowMs;
    this.kazanAttack = true;
  }

  preUpdate() {
    if (!this.active) return;
    const t = this.scene.nowMs - this.bornAt;
    if (t >= L.flightMs) {
      this.destroy();
      return;
    }
    this.x = lidPath(t, this.startX, this.endX, L.flightMs).x;
    this.rotation += 0.35;
    this.body?.setVelocity(0, 0);
  }
}
