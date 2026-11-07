import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { scrollSpeed } from '../systems/Difficulty.js';
import { createSpawnState, dueSpawns } from '../systems/Spawner.js';
import { shouldStartBoss } from '../systems/BossPlanner.js';
import { addXp, applyCard, createProgression, killXp, rollCards, xpToNext } from '../systems/Progression.js';
import { clampDelta } from '../systems/Time.js';
import { applyDamage, createHealth, heal } from '../systems/Health.js';
import { createSpikeState, planSpikes, prefillStartWorld } from '../systems/SpikePlanner.js';
import { heightPoints, killPoints } from '../systems/Score.js';
import { interceptPoint, pickNearest } from '../systems/Targeting.js';
import Player from '../entities/Player.js';
import Spike from '../entities/Spike.js';
import Projectile from '../entities/Projectile.js';
import Lion from '../entities/Lion.js';
import Bat from '../entities/Bat.js';
import Plant from '../entities/Plant.js';
import SpiderBoss from '../entities/SpiderBoss.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    // Clock.paused не скидається Phaser при перезапуску сцени — скидаємо самі
    this.time.paused = false;
    this.elapsedSec = 0;
    this.distancePx = 0;
    this.bossActive = false;
    this.currentScroll = scrollSpeed(0, false);
    this.paused = false;
    this.health = createHealth();
    this.killScore = 0;
    this.progression = createProgression();
    this.levelUpQueue = 0;
    this.levelUpOpen = false;
    this.inputBlockedUntil = 0;
    this.lastHud = '';
    this.dead = false;
    // Зброя гравця — частина прогресії, картки поліпшень змінюють її
    this.weapon = this.progression.weapon;
    this.fireCooldownMs = 0;
    this.spawnState = createSpawnState();
    this.bossState = 'none'; // 'none' | 'active' | 'dead'
    // ?boss=1 у адресі — бос на 5-й секунді (для перевірки)
    const debugBoss = new URLSearchParams(window.location.search).get('boss') === '1';
    this.bossAtSec = debugBoss ? BALANCE.boss.debugAtSec : BALANCE.boss.atSec;
    // Планувальник шипів для обох стін разом (світові координати = distancePx)
    this.spikeState = null;
    // рослини сідають на місце чергового запланованого шипа — так на них теж діють правила проміжків
    this.pendingPlants = 0;

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
      if (this.paused || !bullet.active) return;
      bullet.destroy();
      this.hurtPlayer();
    });

    this.physics.add.overlap(this.playerProjectiles, this.enemies, (proj, enemy) => {
      if (this.paused || !proj.active || !enemy.active) return;
      enemy.takeHit(proj.damage, proj.slow, this.nowMs);
      proj.destroy();
    });

    const onKilled = ({ type }) => {
      if (this.dead) return;
      this.killScore += killPoints(type);
      if (type === 'boss') this.onBossKilled();
      const r = addXp(this.progression, killXp(type));
      this.progression = r.progression;
      this.levelUpQueue += r.levelsGained;
      if (r.levelsGained > 0) this.health = heal(this.health, BALANCE.healPerLevel * r.levelsGained);
      if (this.levelUpQueue > 0 && !this.levelUpOpen) this.openLevelUp();
    };
    const onPicked = (id) => this.onCardPicked(id);
    this.events.on('enemy:killed', onKilled);
    this.events.on('levelup:picked', onPicked);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('enemy:killed', onKilled);
      this.events.off('levelup:picked', onPicked);
      this.scene.stop('LevelUp');
    });

    this.scene.launch('Hud');

    this.input.on('pointerdown', () => {
      if (this.paused || this.dead || this.game.loop.time < this.inputBlockedUntil) return;
      this.player.jump();
    });

    this.spawnSpikes(); // шипи видно з першого кадру

    this.createPauseOverlay();
    this.onVisibility = () => {
      if (document.hidden) this.pauseWithOverlay();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.layoutWidth = this.scale.width;
    const onResize = () => this.relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
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
      this.inputBlockedUntil = this.game.loop.time + BALANCE.tapGuardMs;
      // під час вибору картки гра лишається на паузі, доки картку не оберуть
      if (!this.levelUpOpen) this.setPaused(false);
    });
  }

  /** Пауза гри і вікно вибору картки (по одному на кожен набраний рівень). */
  openLevelUp() {
    this.levelUpOpen = true;
    this.setPaused(true);
    this.scene.launch('LevelUp', { cards: rollCards(this.progression, Math.random) });
  }

  onCardPicked(id) {
    this.progression = applyCard(this.progression, id);
    this.weapon = this.progression.weapon;
    this.levelUpQueue = Math.max(this.levelUpQueue - 1, 0);
    this.emitHud();
    if (this.levelUpQueue > 0) {
      this.scene.launch('LevelUp', { cards: rollCards(this.progression, Math.random) });
      return;
    }
    this.levelUpOpen = false;
    this.inputBlockedUntil = this.game.loop.time + BALANCE.tapGuardMs;
    // якщо застосунок згортали під час вибору — лишаємось на паузі з «Продовжити»
    if (!this.pauseOverlay.visible) this.setPaused(false);
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

  /** Зміна розміру екрана: стіни на всю висоту, слизак на своїй висоті й стіні. */
  relayout() {
    const { width, height } = this.scale;
    // усе, що прикріплене до правої стіни (шипи, рослини, лев на стіні), їде разом із нею
    const dx = width - (this.layoutWidth ?? width);
    this.layoutWidth = width;
    for (const group of [this.hazards, this.enemies]) {
      for (const obj of group.getChildren()) {
        if (obj.side === 'right' && !obj.lunging) obj.x += dx;
      }
    }
    const w = BALANCE.wallWidth;
    const [left, right] = this.walls.getChildren();
    left.setSize(w, height).setPosition(w / 2, height / 2);
    right.setSize(w, height).setPosition(width - w / 2, height / 2);
    this.player.relayout();
    this.pauseOverlay.setPosition(width / 2, height / 2);
  }

  /** Час гри в мс: не йде під час паузи, тож невразливість теж стоїть. */
  get nowMs() {
    return this.elapsedSec * 1000;
  }

  get score() {
    return heightPoints(this.distancePx) + this.killScore;
  }

  hurtPlayer() {
    // фізика може зробити ще кілька кроків у кадрі, де гру поставили на паузу (вікно рівня)
    if (this.dead || this.paused) return;
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

  /** Ставить шипи над екраном за планувальником (сусідні шипи обох стін розділені щонайменше spikeBand). */
  spawnSpikes() {
    if (!this.spikeState) {
      // перший виклик: одразу заповнюємо екран, щоб не чекати перших шипів
      this.spikeState = createSpikeState(prefillStartWorld(this.distancePx, this.player.y), Math.random);
    }
    // проміжки рахуємо за швидкістю БЕЗ сповільнення боса: шип, поставлений під час боса,
    // може доїхати до гравця вже після нього, на повній швидкості
    const r = planSpikes(this.spikeState, this.distancePx, scrollSpeed(this.elapsedSec, false), Math.random);
    this.spikeState = r.state;
    for (const { side, w } of r.spikes) {
      // центр шипа: над верхнім краєм + наскільки світ уже проїхав після точки w
      const y = -BALANCE.spikeHeight / 2 + (this.distancePx - w);
      if (this.pendingPlants > 0) {
        this.pendingPlants -= 1;
        this.spawnEnemy(new Plant(this, side, y));
      } else {
        this.hazards.add(new Spike(this, side, y));
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

  startBoss() {
    this.bossState = 'active';
    this.bossActive = true;
    const boss = this.spawnEnemy(new SpiderBoss(this));
    this.events.emit('hud:boss', { hp: boss.hp, maxHp: boss.maxHp });
  }

  /** Після боса: швидкість і звичайний спавн відновлюються, павучки, що лишились, живуть далі. */
  onBossKilled() {
    this.bossState = 'dead';
    this.bossActive = false;
    this.events.emit('hud:boss', null);
  }

  /** Звичайні вороги за розкладом Spawner. */
  spawnEnemies() {
    const r = dueSpawns(this.spawnState, this.elapsedSec, this.bossActive);
    this.spawnState = r.state;
    for (const type of r.spawn) {
      // лев біжить по стіні, де гравця НЕМАЄ: загроза — ривок, від якого можна відскочити,
      // а не удар знизу по власній стіні, коли згори йдуть шипи
      if (type === 'lion') this.spawnEnemy(new Lion(this, this.player.side === 'left' ? 'right' : 'left'));
      else if (type === 'bat') this.spawnEnemy(new Bat(this));
      else if (type === 'plant') this.pendingPlants += 1;
    }
  }

  emitHud() {
    const s = {
      timeSec: this.elapsedSec,
      score: this.score,
      lives: this.health.lives,
      level: this.progression.level,
      xp: this.progression.xp,
      xpToNext: xpToNext(this.progression.level),
    };
    const key = `${Math.floor(s.timeSec)}|${s.score}|${s.lives}|${s.level}|${s.xp}`;
    if (key === this.lastHud) return;
    this.lastHud = key;
    this.events.emit('hud:update', s);
  }

  /** Зсуває все, що їде зі світом, вниз на dy і знищує те, що пішло за нижній край. */
  scrollObjects(dy) {
    const limit = this.scale.height + BALANCE.offscreenMarginPx;
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
    this.spawnSpikes();
    if (shouldStartBoss(this.elapsedSec, this.bossState, this.bossAtSec)) this.startBoss();
    this.spawnEnemies();
    this.autoFire(dt);
    this.emitHud();
  }
}
