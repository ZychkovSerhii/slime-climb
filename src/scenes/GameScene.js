import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { scrollSpeed } from '../systems/Difficulty.js';
import { clampDelta } from '../systems/Time.js';
import { applyDamage, createHealth } from '../systems/Health.js';
import { minSpikeGap, nextSpikeGap } from '../systems/SpikePlanner.js';
import { heightPoints } from '../systems/Score.js';
import Player from '../entities/Player.js';
import Spike from '../entities/Spike.js';

// Межа під екраном, за якою об'єкти знищуються (px)
const DESPAWN_MARGIN = 100;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    this.elapsedSec = 0;
    this.distancePx = 0;
    this.bossActive = false;
    this.currentScroll = scrollSpeed(0, false);
    this.paused = false;
    this.health = createHealth();
    this.killScore = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = BALANCE.xpBase;
    this.lastHud = '';
    this.dead = false;
    // y наступного шипа для кожної стіни (координати екрана; їде вниз разом зі світом)
    this.nextSpikeY = { left: -BALANCE.spikeHeight, right: -BALANCE.spikeHeight - minSpikeGap(this.currentScroll) * Math.random() };

    // Стіни — тайлові спрайти, «рух» імітується зсувом текстури
    const w = BALANCE.wallWidth;
    this.walls = this.add.group();
    const left = this.add.tileSprite(w / 2, height / 2, w, height, 'wall');
    const right = this.add.tileSprite(width - w / 2, height / 2, w, height, 'wall').setFlipX(true);
    this.walls.addMultiple([left, right]);

    // Групи об'єктів, що їдуть разом зі світом
    this.hazards = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.playerProjectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.scrollingGroups = [this.hazards, this.enemies, this.playerProjectiles, this.enemyProjectiles];

    this.player = new Player(this);

    const hurt = () => this.hurtPlayer();
    this.physics.add.overlap(this.player, this.hazards, hurt);
    this.physics.add.overlap(this.player, this.enemies, hurt);
    this.physics.add.overlap(this.player, this.enemyProjectiles, hurt);

    this.scene.launch('Hud');

    this.input.on('pointerdown', () => {
      if (this.paused || this.dead) return;
      this.player.jump();
    });

    this.createPauseOverlay();
    this.onVisibility = () => {
      if (document.hidden) this.pauseWithOverlay();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
  }

  createPauseOverlay() {
    const { width, height } = this.scale;
    this.pauseOverlay = this.add
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
    this.pauseOverlay.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation?.();
      this.pauseOverlay.setVisible(false);
      this.setPaused(false);
    });
  }

  /** Пауза з кнопкою «Продовжити» (згортання застосунку / вкладки). */
  pauseWithOverlay() {
    this.setPaused(true);
    this.pauseOverlay.setVisible(true);
  }

  /** Ставить/знімає паузу фізики, таймерів, твінів і логіки update. */
  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.physics.pause();
      this.tweens.pauseAll();
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
    }
    this.time.paused = paused;
  }

  /** Час гри в мс: не йде під час паузи, тож невразливість теж стоїть. */
  get nowMs() {
    return this.elapsedSec * 1000;
  }

  get score() {
    return heightPoints(this.distancePx) + this.killScore;
  }

  hurtPlayer() {
    if (this.dead) return;
    const r = applyDamage(this.health, this.nowMs);
    this.health = r.health;
    if (!r.tookDamage) return;
    if (r.died) {
      this.dead = true;
      this.emitHud();
      this.scene.stop('Hud');
      this.scene.start('GameOver', { score: this.score, timeSec: this.elapsedSec });
      return;
    }
    this.blink();
  }

  blink() {
    const half = BALANCE.invulnerableBlinkMs;
    this.player.setAlpha(1);
    this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: half,
      yoyo: true,
      repeat: Math.ceil(BALANCE.invulnerableMs / (2 * half)) - 1,
      onComplete: () => this.player.setAlpha(1),
    });
  }

  /** Ставить шипи над екраном, коли до них «доїхав» світ. */
  spawnSpikes(dy) {
    for (const side of ['left', 'right']) {
      if (this.elapsedSec < BALANCE.spikeStartSec) continue;
      this.nextSpikeY[side] += dy;
      while (this.nextSpikeY[side] >= -BALANCE.spikeHeight) {
        this.hazards.add(new Spike(this, side, this.nextSpikeY[side]));
        this.nextSpikeY[side] -= nextSpikeGap(this.currentScroll, Math.random);
      }
    }
  }

  emitHud() {
    const s = {
      timeSec: this.elapsedSec,
      score: this.score,
      lives: this.health.lives,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
    };
    const key = `${Math.floor(s.timeSec)}|${s.score}|${s.lives}|${s.level}|${s.xp}`;
    if (key === this.lastHud) return;
    this.lastHud = key;
    this.events.emit('hud:update', s);
  }

  /** Зсуває все, що їде зі світом, вниз на dy і знищує те, що пішло за нижній край. */
  scrollObjects(dy) {
    const limit = this.scale.height + DESPAWN_MARGIN;
    for (const group of this.scrollingGroups) {
      for (const obj of group.getChildren().slice()) {
        obj.y += dy;
        if (obj.y > limit) obj.destroy();
      }
    }
    for (const wall of this.walls.getChildren()) {
      wall.tilePositionY -= dy;
    }
  }

  update(time, delta) {
    if (this.paused || this.dead) return;
    const dt = clampDelta(delta);
    this.elapsedSec += dt / 1000;
    this.currentScroll = scrollSpeed(this.elapsedSec, this.bossActive);
    const dy = (this.currentScroll * dt) / 1000;
    this.distancePx += dy;
    this.scrollObjects(dy);
    this.spawnSpikes(dy);
    this.emitHud();
  }
}
