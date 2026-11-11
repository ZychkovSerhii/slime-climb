import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { scrollSpeed } from '../systems/Difficulty.js';
import { createSpawnState, dueSpawns } from '../systems/Spawner.js';
import { afterBossSpawnMul, bannerVisible, bossStage, hazardsSuppressed } from '../systems/BossPlanner.js';
import { createStatus, isPoisoned, playerSpeedMul, poison } from '../systems/Status.js';
import { addXp, applyCard, createProgression, killXp, rollLevelUp, weaponCard, xpToNext } from '../systems/Progression.js';
import { attackDamage, axeRadius, createFireState, inRadius, shotgunAngles, stepFire, weaponJumpMul } from '../systems/Weapons.js';
import { clampDelta } from '../systems/Time.js';
import { applyDamage, createHealth, heal } from '../systems/Health.js';
import {
  activateInvis, breakArmor, cardLoot, createArmor, createInvis, hatStats, hitEffects, invisCharge, invisStats,
  isInvisible, jumpMul, maxLivesFor, rollLoot, stepArmor,
} from '../systems/Skills.js';
import { inInvisButton } from '../systems/Layout.js';
import Familiar from '../entities/Familiar.js';
import { createSpikeState, planSpikes, prefillStartWorld, skipSpikes } from '../systems/SpikePlanner.js';
import { heightPoints, killPoints } from '../systems/Score.js';
import { interceptPoint, pickNearest } from '../systems/Targeting.js';
import { playMusic, resumeAudio, sfx, stopMusic, suspendAudio } from '../systems/Audio.js';
import Player from '../entities/Player.js';
import Spike from '../entities/Spike.js';
import Projectile from '../entities/Projectile.js';
import Lion from '../entities/Lion.js';
import Bat from '../entities/Bat.js';
import Plant from '../entities/Plant.js';
import SpiderBoss from '../entities/SpiderBoss.js';
import WeaponView from '../entities/WeaponView.js';
import { background } from '../art/textures.js';

const POISON_TINT = 0xb0d040; // слизак і так зелений — під отрутою він темніший, болотний
const FADE_MS = 600; // шипи й вороги плавно зникають перед босом
const VENOM_SHOT_TINT = 0x9cff3a; // постріли з «Ядовитою мордою» — кислотні
const OKSANA_TINT = 0xffa8d8; // Оксанка — рожевувата, щоб не плутати з ворожими павучками

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;

    // Clock.paused не скидається Phaser при перезапуску сцени — скидаємо самі
    this.time.paused = false;
    // менеджер анімацій спільний для всієї гри — після виходу з паузи в меню його треба відпустити
    this.anims.resumeAll();
    this.elapsedSec = 0;
    this.distancePx = 0;
    this.currentScroll = scrollSpeed(0, false);
    this.paused = false;
    this.maxLives = maxLivesFor(0);
    this.health = createHealth(this.maxLives);
    // скіли етапу 4b і трофеї павучихи
    this.invis = createInvis();
    this.armor = null; // «Кожух з павучихи»: { on, regenAt }
    this.hats = [];
    this.oksana = null;
    this.lootCards = null; // картки трофеїв, що чекають на вікно (після смерті боса)
    this.killScore = 0;
    this.progression = createProgression();
    this.levelUpQueue = 0;
    this.levelUpOpen = false;
    this.inputBlockedUntil = 0;
    this.lastHud = '';
    this.dead = false;
    // Зброя гравця — частина прогресії, картки поліпшень змінюють її
    this.weapon = this.progression.weapon;
    this.fireState = createFireState();
    this.spawnState = createSpawnState();
    // бос: етап забігу рахує bossStage (before → prep → fight → calm → after)
    this.stage = 'before';
    this.bossSpawned = false;
    this.bannerShown = false;
    this.killedAtSec = null;
    this.status = createStatus();
    // ?boss=1 у адресі — бос на debugAtSec секунді (для перевірки)
    const debugBoss = new URLSearchParams(window.location.search).get('boss') === '1';
    this.bossAtSec = debugBoss ? BALANCE.boss.debugAtSec : BALANCE.boss.atSec;
    // ?weapon=axe|chakra|shotgun — одразу з повністю вкачаною зброєю (для перевірки)
    this.debugWeapon = new URLSearchParams(window.location.search).get('weapon');
    // Планувальник шипів для обох стін разом (світові координати = distancePx)
    this.spikeState = null;
    // рослини сідають на місце чергового запланованого шипа — так на них теж діють правила проміжків
    this.pendingPlants = 0;

    // Фон біому між стінами: тайловий, їде повільніше за стіни (паралакс)
    const w = BALANCE.wallWidth;
    this.bgInfo = background('bg');
    this.bg = this.add.tileSprite(width / 2, height / 2, width - 2 * w, height, 'bg');

    // Стіни — тайлові спрайти, «рух» імітується зсувом текстури
    this.walls = this.add.group();
    const left = this.add.tileSprite(w / 2, height / 2, w, height, 'wall');
    const right = this.add.tileSprite(width - w / 2, height / 2, w, height, 'wall').setFlipX(true);
    this.walls.addMultiple([left, right]);

    // Групи об'єктів, що їдуть разом зі світом
    this.hazards = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.playerProjectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    // те, що зникає перед босом: без зіткнень, але ще їде разом зі світом, поки не розтане
    this.fading = this.add.group();
    this.scrollingGroups = [this.hazards, this.enemies, this.playerProjectiles, this.enemyProjectiles, this.fading];

    this.player = new Player(this);
    this.weaponView = new WeaponView(this, this.player);
    if (BALANCE.weapons[this.debugWeapon]) {
      for (let i = 0; i < BALANCE.weapons[this.debugWeapon].steps; i++) this.progression = applyCard(this.progression, weaponCard(this.debugWeapon));
      this.weaponView.setMain(this.debugWeapon);
    }
    // ?cards=hat,hat,invisibility,loot:web — картки й трофеї з першої секунди (для перевірки)
    const debugCards = new URLSearchParams(window.location.search).get('cards');
    for (const id of debugCards ? debugCards.split(',') : []) this.applyPicked(id);

    const hurt = () => this.hurtPlayer();
    this.physics.add.overlap(this.player, this.hazards, hurt);
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      // отрута — лише коли удар справді пройшов (не під час невразливості)
      if (this.hurtPlayer() && enemy.poisons) this.poisonPlayer();
    });
    this.physics.add.overlap(this.player, this.enemyProjectiles, (player, bullet) => {
      if (this.paused || !bullet.active) return;
      bullet.destroy();
      this.hurtPlayer();
    });

    this.physics.add.overlap(this.playerProjectiles, this.enemies, (proj, enemy) => {
      // крізь невразливого боса снаряди пролітають
      if (this.paused || !proj.active || !enemy.active || enemy.invulnerable) return;
      enemy.takeHit(proj.damage, proj.fx, this.nowMs);
      proj.destroy();
      if (enemy.active) sfx('hit');
    });

    const onKilled = ({ type }) => {
      if (this.dead) return;
      sfx('kill');
      this.killScore += killPoints(type);
      if (type === 'boss') this.onBossKilled();
      const r = addXp(this.progression, killXp(type));
      this.progression = r.progression;
      this.levelUpQueue += r.levelsGained;
      if (r.levelsGained > 0) this.health = heal(this.health, BALANCE.healPerLevel * r.levelsGained, this.maxLives);
      if ((this.levelUpQueue > 0 || this.lootCards) && !this.levelUpOpen) this.openLevelUp();
    };
    const onPicked = (id) => this.onCardPicked(id);
    const onRage = () => playMusic('rage');
    const onInvis = () => this.useInvisibility();
    this.events.on('skill:invis', onInvis);
    this.events.on('enemy:killed', onKilled);
    this.events.on('levelup:picked', onPicked);
    this.events.on('boss:rage', onRage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('enemy:killed', onKilled);
      this.events.off('levelup:picked', onPicked);
      this.events.off('boss:rage', onRage);
      this.events.off('skill:invis', onInvis);
      this.scene.stop('LevelUp');
      stopMusic();
    });

    this.scene.launch('Hud');

    this.input.on('pointerdown', (pointer) => {
      if (this.paused || this.dead || this.game.loop.time < this.inputBlockedUntil) return;
      // тап по кнопці невидимості не стрибок (кнопку малює і ловить HUD)
      if (this.invisStats() && inInvisButton(pointer.x, pointer.y, this.scale.width, this.scale.height)) return;
      this.player.press();
    });
    // відпускання рахуємо завжди: інакше утримання «застрягне», якщо палець підняли під час паузи
    this.input.on('pointerup', () => this.player.release());
    this.player.on('jumped', () => sfx('jump'));
    this.player.on('reversed', () => sfx('reverse'));

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
      resumeAudio();
      this.inputBlockedUntil = this.game.loop.time + BALANCE.tapGuardMs;
      // під час вибору картки гра лишається на паузі, доки картку не оберуть
      if (!this.levelUpOpen) this.setPaused(false);
    });
  }

  /** Пауза гри і вікно вибору картки (по одному на кожен набраний рівень). */
  openLevelUp() {
    this.levelUpOpen = true;
    this.setPaused(true);
    sfx('levelUp');
    this.launchLevelUp();
  }

  /**
   * Наступне вікно: спершу трофеї павучихи (якщо чекають), далі вікна рівня —
   * 2 звичайні картки + зброя (rollLevelUp запам'ятовує, яку зброю запропонували).
   */
  launchLevelUp() {
    if (this.lootCards) {
      this.scene.launch('LevelUp', { cards: this.lootCards, title: `Трофей: ${BALANCE.boss.name}` });
      return;
    }
    const r = rollLevelUp(this.progression, Math.random);
    this.progression = r.progression;
    const { picks, arsenal } = this.progression;
    this.scene.launch('LevelUp', { cards: r.cards, picks, arsenal });
  }

  /** Основна зброя змінилась: вигляд, звук, плашка. */
  onMainWeapon(main) {
    this.weaponView.setMain(main);
    this.fireState = createFireState();
    sfx('weaponReady');
    this.events.emit('hud:banner', { text: `Нова зброя:\n${BALANCE.weapons[main].name}`, ms: 1800 });
  }

  /** Застосовує картку (звичайну, зброю, скіл чи трофей) і її наслідки в сцені. */
  applyPicked(id) {
    const mainBefore = this.progression.arsenal.main;
    this.progression = applyCard(this.progression, id);
    this.weapon = this.progression.weapon;
    const main = this.progression.arsenal.main;
    if (main !== mainBefore) this.onMainWeapon(main);
    if (id === 'extraLife') {
      this.maxLives = maxLivesFor(this.progression.picks.extraLife);
      this.health = heal(this.health, 1, this.maxLives);
    }
    if (id === 'hat') this.syncHats();
    const loot = cardLoot(id);
    if (loot) this.onLoot(loot);
  }

  onCardPicked(id) {
    if (cardLoot(id)) this.lootCards = null;
    else this.levelUpQueue = Math.max(this.levelUpQueue - 1, 0);
    this.applyPicked(id);
    this.emitHud();
    if (this.levelUpQueue > 0 || this.lootCards) {
      this.launchLevelUp();
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
    suspendAudio();
    this.pauseOverlay.setVisible(true);
  }

  /** Ставить/знімає паузу фізики, таймерів, твінів і логіки update. */
  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.physics.pause();
      this.tweens.pauseAll();
      this.anims.pauseAll();
    } else {
      this.physics.resume();
      this.tweens.resumeAll();
      this.anims.resumeAll();
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
    this.bg.setSize(width - 2 * w, height).setPosition(width / 2, height / 2);
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

  /** Удар по гравцю. Повертає true, якщо життя справді знято. */
  hurtPlayer() {
    // фізика може зробити ще кілька кроків у кадрі, де гру поставили на паузу (вікно рівня)
    if (this.dead || this.paused) return false;
    if (isInvisible(this.invis, this.nowMs)) return false;
    // «Кожух з павучихи»: першим знімається чорне життя-броня (з тією ж невразливістю)
    if (this.armor?.on && this.nowMs >= this.health.invulnerableUntil) {
      this.armor = breakArmor(this.armor, this.nowMs);
      this.health = { ...this.health, invulnerableUntil: this.nowMs + BALANCE.invulnerableMs };
      sfx('hurt');
      this.blink();
      return true;
    }
    const r = applyDamage(this.health, this.nowMs);
    this.health = r.health;
    if (!r.tookDamage) return false;
    if (r.died) {
      this.dead = true;
      stopMusic();
      sfx('gameOver');
      this.emitHud();
      this.scene.stop('Hud');
      this.scene.start('GameOver', { score: this.score, timeSec: this.elapsedSec });
      return true;
    }
    sfx('hurt');
    this.blink();
    return true;
  }

  /** Отруєння від павучка рою: слизак повільніший і болотного кольору. */
  poisonPlayer() {
    if (this.dead) return;
    this.status = poison(this.status, this.nowMs);
    sfx('poison');
  }

  /** Швидкість і колір слизака за станами (щокадру). */
  applyStatus() {
    const now = this.nowMs;
    const form = this.progression.relics.includes('form');
    this.player.speedMul = playerSpeedMul(this.status, now) * jumpMul(weaponJumpMul(this.progression.arsenal.main), form);
    this.armor = stepArmor(this.armor, now);
    // невидимість: напівпрозорий; після неї — звичайна прозорість (блимання невразливості керує нею саме)
    const invisible = isInvisible(this.invis, now);
    if (invisible) this.player.setAlpha(BALANCE.skills.invisibility.alpha);
    else if (this.wasInvisible) this.player.setAlpha(1);
    this.wasInvisible = invisible;
    const poisoned = isPoisoned(this.status, now);
    if (poisoned !== this.player.poisonTinted) {
      this.player.poisonTinted = poisoned;
      if (poisoned) this.player.setTint(POISON_TINT);
      else this.player.clearTint();
    }
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
    if (hazardsSuppressed(this.stage)) {
      // біля боса шипів немає; план просто «проїжджає» цей відрізок, щоб потім не висипати пачку
      this.spikeState = skipSpikes(this.spikeState, this.distancePx, scrollSpeed(this.elapsedSec, false), Math.random);
      return;
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
    return this.enemies.getChildren().filter((e) => e.active && e.hp > 0 && !e.invulnerable && e.isOnScreen());
  }

  /** Атака основної зброї: стартовий постріл, сокира, черга чакри або дробовик (логіка — systems/Weapons.js). */
  autoFire(dt) {
    const main = this.progression.arsenal.main;
    const targets = this.visibleEnemies();
    const radius = axeRadius(this.scale.width);
    // сокира б'є лише тих, хто в радіусі; великий бос — краєм тіла
    const size = (t) => Math.min(t.displayWidth, t.displayHeight) / 2;
    const inZone = main === 'axe' ? inRadius(this.player, targets, radius, size) : null;
    // розмах — коли хтось підійшов ближче (triggerFrac радіуса), а б'є всіх у повному радіусі
    const close = inZone ? inRadius(this.player, inZone, radius * BALANCE.weapons.axe.triggerFrac, size) : null;
    const r = stepFire(this.fireState, dt, {
      main,
      fireIntervalMs: this.weapon.fireIntervalMs,
      hasTarget: close ? close.length > 0 : targets.length > 0,
    });
    this.fireState = r.state;
    if (!r.fire) return;
    const damage = attackDamage(main, this.weapon.damage);
    if (inZone) {
      this.swingAxe(inZone, damage, radius);
      return;
    }
    const target = pickNearest(this.player, targets);
    const { vx, vy } = target.screenVelocity(this.currentScroll);
    const aim = interceptPoint(this.player, { x: target.x, y: target.y, vx, vy }, BALANCE.projectileSpeed);
    const angle = Math.atan2(aim.y - this.player.y, aim.x - this.player.x);
    const angles = main === 'shotgun' ? shotgunAngles(angle) : [angle];
    const relics = this.progression.relics;
    const fx = hitEffects(this.weapon.slow, relics);
    const texture = relics.includes('web') ? 'webShot' : 'projectile';
    for (const a of angles) {
      const proj = new Projectile(this, this.player.x, this.player.y, texture, { damage, fx });
      if (relics.includes('venom')) proj.setTint(VENOM_SHOT_TINT);
      this.playerProjectiles.add(proj);
      proj.launch(this.player.x + Math.cos(a) * 100, this.player.y + Math.sin(a) * 100, BALANCE.projectileSpeed, BALANCE.projectileHitboxMul);
    }
    this.weaponView.aim(angle);
    sfx(main === 'shotgun' ? 'shotgun' : 'shoot');
  }

  /** Розмах сокири: шкода всім у радіусі (зокрема босу), без снарядів. */
  swingAxe(targets, damage, radius) {
    this.weaponView.swing(radius);
    sfx('axe');
    let hitAlive = false;
    for (const t of targets) {
      if (!t.active || t.invulnerable) continue;
      t.takeHit(damage, hitEffects(this.weapon.slow, this.progression.relics), this.nowMs);
      if (t.active) hitAlive = true;
    }
    if (hitAlive) sfx('hit');
  }

  spawnEnemy(enemy) {
    this.enemies.add(enemy);
    enemy.spawned();
    return enemy;
  }

  /** Іде бій з босом: світ сповільнений (scrollSpeed), шипів і звичайних ворогів немає. */
  get bossActive() {
    return this.stage === 'fight';
  }

  /** Перехід між етапами забігу навколо боса. */
  onStage(stage) {
    this.stage = stage;
    if (stage === 'prep') this.clearMap();
  }

  /** Перед босом: шипи, звичайні вороги й їхні кулі плавно зникають (без нагород, без зіткнень). */
  clearMap() {
    this.pendingPlants = 0;
    for (const group of [this.hazards, this.enemies, this.enemyProjectiles]) {
      for (const obj of group.getChildren().slice()) {
        group.remove(obj);
        if (obj.body) obj.body.enable = false;
        obj.setActive(false); // зупиняє preUpdate: рослина не стріляє, лев не стрибає
        this.fading.add(obj);
        this.tweens.add({ targets: obj, alpha: 0, duration: FADE_MS, onComplete: () => obj.destroy() });
      }
    }
  }

  showBossBanner() {
    this.bannerShown = true;
    sfx('bossAppear');
    this.events.emit('hud:banner', { text: `БОС: ${BALANCE.boss.name}`, ms: BALANCE.boss.bannerSec * 1000 });
  }

  startBoss() {
    this.bossSpawned = true;
    const boss = this.spawnEnemy(new SpiderBoss(this));
    boss.emitHud();
    playMusic('boss');
  }

  /** Після боса: calmSec нічого небезпечного, далі вороги повертаються поступово. */
  onBossKilled() {
    this.killedAtSec = this.elapsedSec;
    // унікальні картки павучихи: 2 з ще не взятих (кожна — раз за забіг)
    const loot = rollLoot(this.progression.relics, Math.random);
    this.lootCards = loot.length ? loot : null;
    this.events.emit('hud:boss', null);
    playMusic('victory');
  }

  /** Звичайні вороги за розкладом Spawner. */
  spawnEnemies() {
    const mul = afterBossSpawnMul(this.elapsedSec, this.killedAtSec);
    const r = dueSpawns(this.spawnState, this.elapsedSec, hazardsSuppressed(this.stage), mul);
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
      maxLives: this.maxLives,
      armor: this.armor ? (this.armor.on ? 'on' : 'off') : null,
      invis: this.invisHud(),
      level: this.progression.level,
      xp: this.progression.xp,
      xpToNext: xpToNext(this.progression.level),
    };
    const inv = s.invis ? `${s.invis.active}|${Math.floor(s.invis.charge * 40)}` : '';
    const key = `${Math.floor(s.timeSec)}|${s.score}|${s.lives}|${s.maxLives}|${s.armor}|${inv}|${s.level}|${s.xp}`;
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
    this.bg.tilePositionY -= dy * this.bgInfo.parallax;
  }

  update(time, delta) {
    if (this.paused || this.dead) return;
    const dt = clampDelta(delta);
    this.elapsedSec += dt / 1000;
    const stage = bossStage(this.elapsedSec, { atSec: this.bossAtSec, killedAtSec: this.killedAtSec });
    if (stage !== this.stage) this.onStage(stage);
    if (!this.bannerShown && bannerVisible(this.elapsedSec, this.bossAtSec)) this.showBossBanner();
    if (stage === 'fight' && !this.bossSpawned) this.startBoss();
    this.currentScroll = scrollSpeed(this.elapsedSec, this.bossActive);
    const dy = (this.currentScroll * dt) / 1000;
    this.distancePx += dy;
    this.applyStatus();
    this.player.step(dt);
    this.weaponView.update();
    this.scrollObjects(dy);
    this.spawnSpikes();
    this.spawnEnemies();
    this.autoFire(dt);
    for (const f of this.hats) f.step(dt);
    this.oksana?.step(dt);
    this.emitHud();
  }

  // ---------- Скіли етапу 4b і трофеї павучихи ----------

  invisStats() {
    return invisStats(this.progression.picks.invisibility ?? 0);
  }

  /** Стан кнопки невидимості для HUD або null, якщо скіла немає. */
  invisHud() {
    const st = this.invisStats();
    if (!st) return null;
    return { active: isInvisible(this.invis, this.nowMs), charge: invisCharge(this.invis, st, this.nowMs) };
  }

  /** Кнопка невидимості (подія 'skill:invis' від HUD). */
  useInvisibility() {
    if (this.paused || this.dead) return;
    const before = this.invis;
    this.invis = activateInvis(this.invis, this.invisStats(), this.nowMs);
    if (this.invis !== before) sfx('weaponReady');
    this.emitHud();
  }

  /** Капелюхи на голові: кількість і шкода — за взяттями картки. */
  syncHats() {
    const st = hatStats(this.progression.picks.hat ?? 0);
    const H = BALANCE.skills.hat;
    while (this.hats.length < st.count) {
      const i = this.hats.length;
      this.hats.push(
        new Familiar(this, {
          texture: 'hat',
          offset: { x: 0, y: -34 - i * 22 }, // другий — на першому
          speed: H.speed,
          restMs: H.restMs,
          spin: true,
          damage: () => hatStats(this.progression.picks.hat ?? 0).damage,
        }),
      );
    }
  }

  /** Трофей павучихи взято: вмикаємо його ефект. */
  onLoot(id) {
    const L = BALANCE.bossLoot;
    if (id === 'armor' && !this.armor) this.armor = createArmor();
    if (id === 'oksana' && !this.oksana) {
      this.oksana = new Familiar(this, {
        texture: 'smallSpider',
        anim: 'crawl',
        tint: OKSANA_TINT,
        offset: { x: 30, y: 26 },
        speed: L.oksana.speed,
        restMs: L.oksana.intervalMs,
        damage: () => L.oksana.damage + (this.weapon.damage - BALANCE.projectileDamage), // росте з «Уроном»
      });
    }
    if (id === 'form') this.player.setSkin('slimeSpider');
    const names = { armor: 'Кожух з павучихи', venom: 'Ядовита морда', oksana: 'Оксанка з тобою', web: 'Дупа павучихи', form: 'Ти став павуком' };
    this.events.emit('hud:banner', { text: names[id], ms: 1500 });
  }
}
