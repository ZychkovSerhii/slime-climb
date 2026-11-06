import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { scrollSpeed } from '../systems/Difficulty.js';
import { createSpawnState, dueSpawns } from '../systems/Spawner.js';
import { clampDelta } from '../systems/Time.js';
import { applyDamage, createHealth } from '../systems/Health.js';
import { minSpikeGap, nextSpikeGap } from '../systems/SpikePlanner.js';
import { heightPoints, killPoints } from '../systems/Score.js';
import { interceptPoint, pickNearest } from '../systems/Targeting.js';
import Player from '../entities/Player.js';
import Spike from '../entities/Spike.js';
import Projectile from '../entities/Projectile.js';
import Lion from '../entities/Lion.js';
import Bat from '../entities/Bat.js';
import Plant from '../entities/Plant.js';

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
    // Зброя гравця; картки поліпшень (Task 8) змінюють ці поля
    this.weapon = { fireIntervalMs: BALANCE.fireIntervalMs, damage: BALANCE.projectileDamage, slow: null };
    this.fireCooldownMs = 0;
    this.spawnState = createSpawnState();
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
    this.physics.add.overlap(this.player, this.enemyProjectiles, (player, bullet) => {
      if (!bullet.active) return;
      bullet.destroy();
      this.hurtPlayer();
    });

    this.physics.add.overlap(this.playerProjectiles, this.enemies, (proj, enemy) => {
      if (!proj.active || !enemy.active) return;
      enemy.takeHit(proj.damage, proj.slow, this.nowMs);
      proj.destroy();
    });

    const onKilled = ({ type }) => {
      this.killScore += killPoints(type);
    };
    this.events.on('enemy:killed', onKilled);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off('enemy:killed', onKilled));

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

  /** Вороги, видимі на екрані й живі — кандидати в цілі. */
  visibleEnemies() {
    return this.enemies.getChildren().filter((e) => e.active && e.hp > 0 && e.isOnScreen());
  }

  autoFire(dt) {
    this.fireCooldownMs = Math.max(this.fireCooldownMs - dt, 0);
    if (this.fireCooldownMs > 0) return;
    const target = pickNearest(this.player, this.visibleEnemies());
    if (!target) return; // без ворогів не стріляємо; постріл одразу, щойно ворог з'явиться
    const proj = new Projectile(this, this.player.x, this.player.y, 'projectile', {
      damage: this.weapon.damage,
      slow: this.weapon.slow,
    });
    this.playerProjectiles.add(proj);
    const { vx, vy } = target.screenVelocity(this.currentScroll);
    const aim = interceptPoint(this.player, { x: target.x, y: target.y, vx, vy }, BALANCE.projectileSpeed);
    proj.launch(aim.x, aim.y, BALANCE.projectileSpeed);
    this.fireCooldownMs = this.weapon.fireIntervalMs;
  }

  spawnEnemy(enemy) {
    this.enemies.add(enemy);
    enemy.spawned();
    return enemy;
  }

  /** Звичайні вороги за розкладом Spawner. */
  spawnEnemies() {
    const r = dueSpawns(this.spawnState, this.elapsedSec, this.bossActive);
    this.spawnState = r.state;
    const randomSide = () => (Math.random() < 0.5 ? 'left' : 'right');
    for (const type of r.spawn) {
      if (type === 'lion') this.spawnEnemy(new Lion(this, randomSide()));
      else if (type === 'bat') this.spawnEnemy(new Bat(this));
      else if (type === 'plant') this.spawnEnemy(new Plant(this, randomSide()));
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
        if (obj.scrollsWithWorld === false) continue;
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
    this.spawnEnemies();
    this.autoFire(dt);
    this.emitHud();
  }
}
