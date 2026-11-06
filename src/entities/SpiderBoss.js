import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { pickStrikeX } from '../systems/BossPlanner.js';
import Enemy from './Enemy.js';
import SmallSpider from './SmallSpider.js';

const B = BALANCE.boss;
const WEB_COLOR = 0xdddddd;

/**
 * Бос-павук. Цикл: enter (спуск до hangY) → telegraph (тінь у точці удару, павук зсувається туди)
 * → strike (падає на павутині до висоти гравця) → retreat (піднімається до hangY) → rest → telegraph…
 * Кожні boss.spawnMs випускає spawnCount павучків. Таймери — на часі гри (nowMs), тож пауза їх зупиняє.
 * Подія сцени 'hud:boss' { hp, maxHp } — після кожного влучання.
 */
export default class SpiderBoss extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.get('spider').getSourceImage();
    super(scene, width / 2, -tex.height / 2, 'spider', 'boss');
    this.scrollsWithWorld = false;
    this.maxHp = this.hp;
    this.laneMin = BALANCE.wallWidth + tex.width / 2;
    this.laneMax = width - BALANCE.wallWidth - tex.width / 2;

    this.web = scene.add.graphics().setDepth(this.depth - 1);
    this.shadow = scene.add.image(0, 0, 'shadow').setVisible(false);
    this.state = 'enter';
    this.stateUntil = 0;
    this.nextSpawnAt = scene.nowMs + B.spawnMs;
  }

  setState(state, durationMs = 0) {
    this.state = state;
    this.stateUntil = this.scene.nowMs + durationMs;
  }

  takeHit(damage, slow, nowMs) {
    super.takeHit(damage, slow, nowMs);
    if (this.active) this.scene.events.emit('hud:boss', { hp: this.hp, maxHp: this.maxHp });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const now = scene.nowMs;
    const mul = this.speedMul(now);
    const targetY = scene.player.y;

    switch (this.state) {
      case 'enter':
        this.body.setVelocity(0, B.retreatSpeed * mul);
        if (this.y >= B.hangY) {
          this.y = B.hangY;
          this.startTelegraph();
        }
        break;
      case 'telegraph':
        if (now >= this.stateUntil) {
          this.x = this.strikeX;
          this.body.setVelocity(0, 0);
          this.setState('strike');
        }
        break;
      case 'strike':
        this.body.setVelocity(0, B.dropSpeed * mul);
        if (this.y >= targetY) {
          this.y = targetY;
          this.shadow.setVisible(false);
          this.setState('retreat');
        }
        break;
      case 'retreat':
        this.body.setVelocity(0, -B.retreatSpeed * mul);
        if (this.y <= B.hangY) {
          this.y = B.hangY;
          this.body.setVelocity(0, 0);
          this.setState('rest', B.restMs);
        }
        break;
      case 'rest':
        if (now >= this.stateUntil) this.startTelegraph();
        break;
      default:
        break;
    }

    if (now >= this.nextSpawnAt) {
      this.nextSpawnAt = now + B.spawnMs;
      this.spawnSpiders();
    }

    this.web.clear();
    this.web.lineStyle(3, WEB_COLOR, 0.8).lineBetween(this.x, 0, this.x, this.y);
  }

  startTelegraph() {
    const scene = this.scene;
    this.strikeX = pickStrikeX(scene.player.x, Math.random, this.laneMin, this.laneMax);
    this.shadow.setPosition(this.strikeX, scene.player.y).setVisible(true);
    // павук зсувається над точкою удару рівно за час попередження
    const dx = this.strikeX - this.x;
    this.body.setVelocity(dx / (B.telegraphMs / 1000), 0);
    this.setState('telegraph', B.telegraphMs);
  }

  spawnSpiders() {
    const [min, max] = B.spawnCount;
    const n = Phaser.Math.Between(min, max);
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Clamp(this.x + (i - (n - 1) / 2) * this.width * 0.5, this.laneMin, this.laneMax);
      this.scene.spawnEnemy(new SmallSpider(this.scene, x, this.y));
    }
  }

  destroy(fromScene) {
    this.web?.destroy();
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
