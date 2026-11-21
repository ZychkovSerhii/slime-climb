import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { spiderShouldLunge } from '../systems/Grass.js';
import { otherSide } from '../systems/WallWalkers.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.hairySpider;

/**
 * Волохань (біом 5): з'являється над верхнім краєм на стіні side (де гравця немає) і повзе по ній униз (відносно екрана).
 * На lungeYFrac висоти екрана завмирає, блимає windupMs і стрибає в точку, де гравець у момент стрибка.
 * Промахнувся й вилетів за край живим — returns разів з'являється згори на стіні, де гравця немає, і знову атакує.
 * Спрайт — вигляд згори, мордою праворуч; поворот — за напрямком руху. type — 'hairySpider' (вершник передає 'rider').
 */
export default class HairySpider extends Enemy {
  constructor(scene, side, type = 'hairySpider') {
    const tex = scene.textures.getFrame('hairySpider');
    super(scene, 0, -tex.height, 'hairySpider', type);
    this.hairy = true;
    this.scrollsWithWorld = false;
    this.setScale(CFG.scale);
    this.returnsLeft = CFG.returns;
    this.play(animKey('hairySpider', 'crawl'));
    this.placeTop(side);
  }

  /** Згори на стіні side, мордою вниз. */
  placeTop(side) {
    const half = (this.scene.textures.getFrame('hairySpider').height * CFG.scale) / 2;
    this.side = side;
    const x = side === 'left' ? BALANCE.wallWidth + half : this.scene.scale.width - BALANCE.wallWidth - half;
    this.setPosition(x, -half * 2);
    if (this.body) this.body.reset(x, -half * 2);
    this.setRotation(Math.PI / 2);
    this.act = 'crawl';
    this.windupUntil = 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    const mul = this.speedMul(now);
    const p = scene.player;
    if (this.act === 'crawl') {
      this.body.setVelocity(0, CFG.speed * mul);
      if (spiderShouldLunge(this.y, scene.scale.height)) {
        this.act = 'windup';
        this.windupUntil = now + CFG.windupMs;
        this.body.setVelocity(0, 0);
        this.anims.pause();
        this.blink = scene.tweens.add({ targets: this, alpha: 0.4, duration: CFG.windupMs / 4, yoyo: true, repeat: 1 });
      }
    } else if (this.act === 'windup') {
      this.body.setVelocity(0, 0);
      if (now >= this.windupUntil) {
        this.act = 'lunge';
        this.setAlpha(1);
        this.anims.resume();
        this.dir = new Phaser.Math.Vector2(p.x - this.x, p.y - this.y).normalize();
        this.setRotation(this.dir.angle());
        sfx('bite');
      }
    } else {
      this.body.setVelocity(this.dir.x * CFG.lungeSpeed * mul, this.dir.y * CFG.lungeSpeed * mul);
      if (this.isOffscreen()) {
        if (this.returnsLeft > 0) {
          this.returnsLeft -= 1;
          this.placeTop(otherSide(p.side));
        } else this.destroy();
      }
    }
    if (this.act === 'crawl' && this.y > scene.scale.height + BALANCE.offscreenMarginPx) this.destroy();
  }

  destroy(fromScene) {
    this.blink?.stop();
    super.destroy(fromScene);
  }
}
