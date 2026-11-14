import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { scrollSpeed } from '../systems/Difficulty.js';
import { biomeIndex, firstSegment } from '../systems/Cycle.js';
import { createStatus, fireIntervalMul, isPoisoned, isRoared, playerSpeedMul, poison, roar } from '../systems/Status.js';
import { giftXp, rollGift, xpToLevelUp } from '../systems/Biome.js';
import { loadSettings } from '../systems/Settings.js';
import { addXp, applyCard, cardUpgrade, createProgression, killXp, rollLevelUp, weaponCard, weaponUpgrades, xpToNext } from '../systems/Progression.js';
import { attackDamage, axeRadius, axeTier, createFireState, hasMiniAxe, inRadius, shotgunAngles, stepFire, weaponJumpMul } from '../systems/Weapons.js';
import { clampDelta } from '../systems/Time.js';
import { applyDamage, createHealth, heal, healForLevels } from '../systems/Health.js';
import {
  activateInvis, breakArmor, cardLoot, createInvis, hatStats, hitEffects, invisCharge, invisStats,
  isInvisible, jumpMul, maxLivesFor, stepArmor,
} from '../systems/Skills.js';
import { inInvisButton, inPauseButton } from '../systems/Layout.js';
import Familiar from '../entities/Familiar.js';
import { heightPoints, killPoints } from '../systems/Score.js';
import { loadMeta, recordKill, saveMeta, skinSprite } from '../systems/Meta.js';
import { browserStorage } from '../systems/HighScore.js';
import { interceptPoint, pickNearest } from '../systems/Targeting.js';
import { playMusic, sfx, stopMusic } from '../systems/Audio.js';
import Player from '../entities/Player.js';
import Projectile from '../entities/Projectile.js';
import BiomeDirector from '../game/BiomeDirector.js';
import BossDirector, { BOSS_OF_KILL } from '../game/BossDirector.js';
import LootEffects from '../game/LootEffects.js';
import PauseController from '../game/PauseController.js';
import SpawnDirector from '../game/SpawnDirector.js';
import WeaponView from '../entities/WeaponView.js';
import { activeForm } from '../systems/ShkodkoLoot.js';
import { loadTuning, setTuning, tuning } from '../systems/Tuning.js';
import { isEligibleRun } from '../systems/LeaderboardRules.js';

import { canSplit, useSplit } from '../systems/KolyaLoot.js';
import { canBoil, useBoil } from '../systems/KazanLoot.js';

const POISON_TINT = 0xb0d040; // слизак і так зелений — під отрутою він темніший, болотний
const ROAR_TINT = 0x9fb4c8; // приголомшений ричанням — сірувато-блакитний
// глибини фону: фон −3, сніг −2 (Snow.js), стіни −1, усе інше 0
const FADE_MS = 600; // шипи й вороги плавно зникають перед босом
const VENOM_SHOT_TINT = 0x9cff3a; // постріли з «Ядовитою мордою» — кислотні
// шляпа на голові слизака: центр шляпи відносно центру слизака і зсув другої шляпи
const HAT_Y = -15;
const HAT_STACK = 12;

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
    this.loot = new LootEffects(this); // ефекти трофеїв босів (Оксанка, мішок, личинка, черпачок…)
    this.lootCards = null; // картки трофеїв, що чекають на вікно (після смерті боса)
    this.lootTitle = null; // заголовок вікна трофеїв: чий трофей
    this.kolyaSplit = null; // «Я КОЛЯ»: { usedAtLevel }
    this.kazanBoil = null; // «Я КАЗАН»: { usedAtLevel } (етап 11)
    this.killScore = 0;
    // мета-прогрес (етап 5): Шаги й лічильники пишуться в сховище одразу при вбивстві — закритий посеред забігу застосунок їх не губить
    this.storage = browserStorage();
    // режим налаштувань: множники читаються один раз на забіг (до створення будь-якого ворога)
    setTuning(loadTuning(this.storage));
    this.meta = loadMeta(this.storage);
    this.runSteps = 0;
    this.progression = createProgression();
    this.levelUpQueue = 0;
    this.levelUpOpen = false;
    this.introOpen = false; // представлення боса (етап 9): гра на паузі
    this.inputBlockedUntil = 0;
    this.lastHud = '';
    this.dead = false;
    // Зброя гравця — частина прогресії, картки поліпшень змінюють її
    this.weapon = this.progression.weapon;
    this.fireState = createFireState();
    this.spawner = new SpawnDirector(this); // шипи, вороги за розкладом, черга ходоків, зима, сердечка
    // Коло біомів (етап 6b, systems/Cycle): відрізок — біом і бос наприкінці; етап рахує runStage
    // (calm → before/after → prep → fight). killedAtSec — секунда смерті попереднього боса (тиша й плавний спавн).
    // Перевірка: ?boss=1 — павучиха на 6-й с, ?winter=1 — зима без боса, ?shkodko=1 — зима і Шкодько на 6-й с,
    // ?bamboo=1 — бамбук без боса, ?kolya=1 — бамбук і Коля на 6-й с (етап 9);
    // ?lava=1 — лава без боса, ?kazan=1 — лава і Казан на 6-й с, ?loop=N — почати з кола N (етап 11).
    const q = new URLSearchParams(window.location.search);
    const start = ['kazan', 'lava', 'bear', 'kolya', 'bamboo', 'shkodko', 'winter'].find((k) => q.get(k) === '1') ?? (q.get('boss') === '1' ? 'spider' : 'cave');
    this.seg = firstSegment(start, Math.max(0, Math.min(9, parseInt(q.get('loop') ?? '0', 10) || 0)));
    this.loop = this.seg.loop; // номер кола з 0: вороги й боси міцніші (Enemy читає scene.loop)
    this.stage = 'before';
    this.killedAtSec = null;
    this.bosses = new BossDirector(this); // етапи навколо боса, представлення, смерть і трофеї
    this.status = createStatus();
    this.biome = 'cave';
    this.settings = loadSettings(browserStorage());
    this.landedAt = -Infinity; // коли слизак востаннє приземлився (пільга від струменя саламандри)
    // ?weapon=axe|chakra|shotgun — одразу з повністю вкачаною зброєю (для перевірки)
    this.debugWeapon = new URLSearchParams(window.location.search).get('weapon');

    // Фон, стіни й погода біому
    this.biomes = new BiomeDirector(this);

    // Групи об'єктів, що їдуть разом зі світом
    this.hazards = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.playerProjectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    // те, що зникає перед босом: без зіткнень, але ще їде разом зі світом, поки не розтане
    this.fading = this.add.group();
    this.pickups = this.physics.add.group(); // подарунки зими
    this.bombs = this.add.group(); // подарунки-бомби Шкодька (вибух перевіряє відстань сам)
    this.friendlyBombs = this.add.group(); // свої бомби з карток Шкодька (б'ють ворогів, не гравця)
    this.scrollingGroups = [this.hazards, this.enemies, this.playerProjectiles, this.enemyProjectiles, this.fading, this.pickups, this.bombs, this.friendlyBombs];

    this.player = new Player(this);
    this.player.setSkin(skinSprite(this.meta));
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
      if (this.paused || !enemy.active) return;
      enemy.onTouch?.(); // аура ведмедя сповільнює (етап 10)
      if (enemy.harmless) return; // Санта не б'є
      // отрута — лише коли удар справді пройшов (не під час невразливості)
      if (this.hurtPlayer() && enemy.poisons) this.poisonPlayer();
    });
    this.physics.add.overlap(this.player, this.pickups, (player, gift) => this.collectGift(gift));
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

    const onKilled = ({ type, x, y }) => {
      if (this.dead) return;
      if (type === 'spark') this.spawner.splitSpark(x, y);
      sfx('kill');
      this.killScore += killPoints(type);
      this.onMetaKill(type);
      if (BOSS_OF_KILL[type]) this.bosses.onBossKilled(type);
      // Санта дає рівень: рівно стільки досвіду, скільки бракує до наступного
      const xp = type === 'santa' ? xpToLevelUp(this.progression.xp, xpToNext(this.progression.level)) : killXp(type, { biome: this.biomeIdx });
      this.gainXp(xp);
    };
    const onPicked = (id) => this.onCardPicked(id);
    const onRage = () => playMusic('rage');
    const onInvis = () => this.useInvisibility();
    const onIntroClosed = () => this.bosses.onIntroClosed();
    this.events.on('intro:closed', onIntroClosed);
    this.events.on('skill:invis', onInvis);
    this.events.on('enemy:killed', onKilled);
    this.events.on('levelup:picked', onPicked);
    this.events.on('boss:rage', onRage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('enemy:killed', onKilled);
      this.events.off('levelup:picked', onPicked);
      this.events.off('boss:rage', onRage);
      this.events.off('skill:invis', onInvis);
      this.events.off('intro:closed', onIntroClosed);
      this.scene.stop('LevelUp');
      this.scene.stop('BossIntro');
      stopMusic();
    });

    this.scene.launch('Hud');

    this.input.on('pointerdown', (pointer) => {
      if (this.paused || this.dead || this.game.loop.time < this.inputBlockedUntil) return;
      // кнопка паузи в правому верхньому куті (фідбек-6): малює HUD, ловимо тут — щоб тап не став стрибком
      if (inPauseButton(pointer.x, pointer.y, this.scale.width, this.scene.get('Hud').top ?? 0)) {
        this.pauseWithOverlay();
        return;
      }
      // тап по кнопці невидимості не стрибок (кнопку малює і ловить HUD)
      if (this.invisStats() && inInvisButton(pointer.x, pointer.y, this.scale.width, this.scale.height)) return;
      this.player.press();
    });
    // відпускання рахуємо завжди: інакше утримання «застрягне», якщо палець підняли під час паузи
    this.input.on('pointerup', () => this.player.release());
    this.player.on('jumped', () => sfx('jump'));
    this.player.on('landed', () => {
      this.landedAt = this.nowMs;
    });
    this.player.on('reversed', () => sfx('reverse'));

    if (this.seg.biome !== 'cave') this.enterBiome(this.seg.biome); // до перших шипів — щоб одразу були бурульки
    this.spawner.spawnSpikes(); // шипи видно з першого кадру

    this.pause = new PauseController(this);
    // ?intro=1 — представлення павучихи одразу після старту (перевірка §9.3)
    if (q.get('intro') === '1') this.bosses.showIntro('spider', { music: false });
    this.pause.watchVisibility();
    this.layoutWidth = this.scale.width;
    const onResize = () => this.relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  /** Досвід (вбивства, подарунки): нові рівні лікують і відкривають вікно карток. */
  gainXp(amount) {
    const before = this.progression.level;
    const r = addXp(this.progression, Math.max(1, Math.round(amount * tuning().xp))); // множник режиму налаштувань
    this.progression = r.progression;
    this.levelUpQueue += r.levelsGained;
    const healed = healForLevels(before, this.progression.level); // з 8-го рівня лікує кожен другий (етап 10)
    if (healed > 0) this.health = heal(this.health, healed, this.maxLives);
    if ((this.levelUpQueue > 0 || this.lootCards) && !this.levelUpOpen && !this.introOpen) this.openLevelUp();
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
      this.scene.launch('LevelUp', { cards: this.lootCards, title: this.lootTitle ?? `Трофей: ${BALANCE.boss.name}` });
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

  /** Прокачка основної зброї: банер; на miniAxeAt у сокири — міні-сокира-помічниця. */
  onWeaponUpgrade(weaponId) {
    const n = weaponUpgrades(this.progression, weaponId);
    sfx('weaponReady');
    this.events.emit('hud:banner', { text: `${BALANCE.weapons[weaponId].name}\n+${n}`, ms: 1200 });
    if (weaponId === 'axe') this.weaponView.setTier(axeTier(n));
    if (hasMiniAxe(weaponId, n) && !this.miniAxe) {
      const M = BALANCE.weaponUpgrades.axe.miniAxe;
      this.miniAxe = new Familiar(this, {
        texture: 'axe',
        offset: { x: 34, y: -6 },
        speed: M.speed,
        restMs: M.restMs,
        spin: true,
        scale: 0.6,
        damage: () => M.damage,
      });
    }
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
    const up = cardUpgrade(id);
    if (up) this.onWeaponUpgrade(up);
    const loot = cardLoot(id);
    if (loot) this.loot.onLoot(loot);
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
    if (!this.pause.overlayOpen) this.setPaused(false);
  }

  // Пауза живе в game/PauseController; ці три методи — зовнішній договір (main.js, HUD, сутності, бот).
  pauseWithOverlay() {
    this.pause.openOverlay();
  }

  quitToMenu() {
    this.pause.quitToMenu();
  }

  setPaused(paused) {
    this.pause.set(paused);
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
    this.biomes.relayout();
    this.player.relayout();
    this.pause.relayout();
  }

  /** Скільки біомів пройдено (етап 10): звичайні вороги міцніші ×1,15 за кожен (Enemy читає). */
  get biomeIdx() {
    return biomeIndex(this.seg);
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
    // «Я КОЛЯ» (етап 9): раз за рівень замість втрати життя — поділ (після броні: вона не життя)
    if (activeForm(this.progression.relics) === 'iamkolya' && this.nowMs >= this.health.invulnerableUntil && canSplit(this.kolyaSplit, this.progression.level)) {
      this.kolyaSplit = useSplit(this.kolyaSplit, this.progression.level);
      this.loot.splitIntoCopies();
      return false;
    }
    // «Я КАЗАН» (етап 11): раз за рівень замість втрати життя — щит і кільце лави
    if (activeForm(this.progression.relics) === 'iamkazan' && this.nowMs >= this.health.invulnerableUntil && canBoil(this.kazanBoil, this.progression.level)) {
      this.kazanBoil = useBoil(this.kazanBoil, this.progression.level);
      this.loot.lavaRing();
      return false;
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
      // таблиця лідерів (етап 12): лише висота і лише «Норма» без параметрів URL
      this.scene.start('GameOver', {
        score: this.score, timeSec: this.elapsedSec, steps: this.runSteps, totalSteps: this.meta.steps,
        height: heightPoints(this.distancePx), eligible: isEligibleRun({ tuning: tuning(), search: window.location.search }),
      });
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
    const form = activeForm(this.progression.relics) === 'form'; // «Я ШКОДЬКО» скасовує стрибок павука
    this.player.speedMul = playerSpeedMul(this.status, now) * jumpMul(weaponJumpMul(this.progression.arsenal.main), form);
    this.armor = stepArmor(this.armor, now);
    // невидимість: напівпрозорий; після неї — звичайна прозорість (блимання невразливості керує нею саме)
    const invisible = isInvisible(this.invis, now);
    if (invisible) this.player.setAlpha(BALANCE.skills.invisibility.alpha);
    else if (this.wasInvisible) this.player.setAlpha(1);
    this.wasInvisible = invisible;
    // ричання ведмедя важливіше за отруту: від нього стрибок утричі повільніший
    const tint = isRoared(this.status, now) ? ROAR_TINT : isPoisoned(this.status, now) ? POISON_TINT : null;
    if (tint !== this.player.statusTint) {
      this.player.statusTint = tint;
      if (tint !== null) this.player.setTint(tint);
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

  /** Вороги, видимі на екрані й живі — кандидати в цілі. */
  visibleEnemies() {
    return this.enemies.getChildren().filter((e) => e.active && e.hp > 0 && !e.invulnerable && e.isOnScreen());
  }

  /** Атака основної зброї: стартовий постріл, сокира, черга чакри або дробовик (логіка — systems/Weapons.js). */
  autoFire(dt) {
    const main = this.progression.arsenal.main;
    const upgrades = main ? weaponUpgrades(this.progression, main) : 0;
    const targets = this.visibleEnemies();
    const radius = axeRadius(this.scale.width, upgrades);
    // сокира б'є лише тих, хто в радіусі; великий бос — краєм тіла
    const size = (t) => Math.min(t.displayWidth, t.displayHeight) / 2;
    const inZone = main === 'axe' ? inRadius(this.player, targets, radius, size) : null;
    // розмах — коли хтось підійшов ближче (triggerFrac радіуса), а б'є всіх у повному радіусі
    const close = inZone ? inRadius(this.player, inZone, radius * BALANCE.weapons.axe.triggerFrac, size) : null;
    const r = stepFire(this.fireState, dt, {
      main,
      fireIntervalMs: this.weapon.fireIntervalMs * fireIntervalMul(this.status, this.nowMs),
      upgrades,
      hasTarget: close ? close.length > 0 : targets.length > 0,
    });
    this.fireState = r.state;
    if (!r.fire) return;
    const damage = attackDamage(main, this.weapon.damage, upgrades);
    if (inZone) {
      this.swingAxe(inZone, damage, radius);
      return;
    }
    const target = pickNearest(this.player, targets);
    const { vx, vy } = target.screenVelocity(this.currentScroll);
    const aim = interceptPoint(this.player, { x: target.x, y: target.y, vx, vy }, BALANCE.projectileSpeed);
    const angle = Math.atan2(aim.y - this.player.y, aim.x - this.player.x);
    const angles = main === 'shotgun' ? shotgunAngles(angle, upgrades) : [angle];
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

  // Спавн живе в game/SpawnDirector; spawnEnemies лишився делегатом — його глушить бот (playtest --no-enemies).
  spawnEnemies() {
    this.spawner.spawnEnemies();
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

  /** Об'єкт плавно зникає: без нагород і зіткнень, але ще їде зі світом, поки не розтане. */
  fadeOut(obj, group) {
    group.remove(obj);
    if (obj.body) obj.body.enable = false;
    obj.setActive(false); // зупиняє preUpdate: рослина не стріляє, лев не стрибає
    this.fading.add(obj);
    this.tweens.add({ targets: obj, alpha: 0, duration: FADE_MS, onComplete: () => obj.destroy() });
  }

  // Боси живуть у game/BossDirector; spawnBearBats лишився делегатом — його кличе BearBoss.
  spawnBearBats() {
    this.bosses.spawnBearBats();
  }

  collectGift(gift) {
    if (this.paused || this.dead || !gift.active) return;
    gift.destroy();
    if (gift.kind === 'heart') {
      sfx('levelUp');
      this.health = heal(this.health, 1, this.maxLives);
      this.floatText('+1 життя', '#ff7a8a');
      return;
    }
    sfx('gift');
    gift.onCollect?.(); // подарунковий дощ Шкодька рахує зібрані
    // подарунковий дощ Шкодька дає фіксований досвід; звичайний зимовий подарунок — випадковий бонус (фідбек-3)
    if (gift.xp !== undefined) {
      this.gainXp(gift.xp);
      return;
    }
    this.giftBonus(rollGift(Math.random, { livesFull: this.health.lives >= this.maxLives }));
  }

  /** Бонус подарунка з написом над слизаком. */
  giftBonus(kind) {
    const G = BALANCE.winter.gift;
    if (kind === 'steps') {
      this.meta = { ...this.meta, steps: this.meta.steps + G.steps };
      this.runSteps += G.steps;
      saveMeta(this.storage, this.meta);
      this.floatText(`+${G.steps} Шаги`, '#f2c440');
    } else if (kind === 'shield') {
      this.health = { ...this.health, invulnerableUntil: Math.max(this.health.invulnerableUntil, this.nowMs + G.shieldMs) };
      this.showShield(G.shieldMs);
      this.floatText('Щит!', '#9fe0ff');
    } else if (kind === 'life') {
      this.health = heal(this.health, 1, this.maxLives);
      this.floatText('+1 життя', '#ff7a8a');
    } else {
      const xp = giftXp(xpToNext(this.progression.level));
      this.floatText(`+${xp} досвіду`, '#b4e06a');
      this.gainXp(xp); // після напису: новий рівень ставить гру на паузу
    }
  }

  /** Бульбашка щита навколо слизака на ms (сам захист — невразливість у health). */
  showShield(ms) {
    this.shieldFx?.destroy();
    const r = BALANCE.playerSize * 0.8;
    const fx = this.add.circle(this.player.x, this.player.y, r, 0x9fe0ff, 0.18).setStrokeStyle(3, 0x9fe0ff, 0.8).setDepth(40);
    this.shieldFx = fx;
    this.shieldUntil = this.nowMs + ms;
  }

  /** Щокадру: бульбашка йде за слизаком і зникає, коли щит скінчився. */
  stepShield() {
    if (!this.shieldFx) return;
    this.shieldFx.setPosition(this.player.x, this.player.y);
    const left = this.shieldUntil - this.nowMs;
    if (left <= 0) {
      this.shieldFx.destroy();
      this.shieldFx = null;
    } else if (left < 600) this.shieldFx.setAlpha(Math.floor(left / 100) % 2 ? 1 : 0.3); // блимає перед кінцем
  }

  /** Ричання ведмедя дістало слизака (невидимого — ні). */
  roarPlayer() {
    if (this.dead || isInvisible(this.invis, this.nowMs)) return;
    this.status = roar(this.status, this.nowMs);
  }

  /** Перехід у новий біом: розклад ворогів, бурульки, плавна зміна фону й стін, сніг. */
  enterBiome(biome) {
    const from = this.biome;
    this.biome = biome;
    // після боса — тиша calmSec; перші появи біому рахуються від її кінця
    const startSec = this.elapsedSec < 0.5 ? 0 : this.elapsedSec + BALANCE.boss.calmSec;
    this.spawner.onBiome(biome, startSec);
    const instant = from === biome || this.elapsedSec < 0.5;
    this.biomes.enter(biome, instant);
  }

  /** Вбивство для мета-прогресу: Шаги, лічильник, досягнення (тост у HUD). */
  onMetaKill(type) {
    const r = recordKill(this.meta, type);
    this.meta = r.meta;
    this.runSteps += r.steps;
    saveMeta(this.storage, this.meta);
    for (const a of r.unlocked) this.events.emit('hud:toast', a.title);
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
      steps: this.runSteps,
    };
    const inv = s.invis ? `${s.invis.active}|${Math.floor(s.invis.charge * 40)}` : '';
    const key = `${Math.floor(s.timeSec)}|${s.score}|${s.lives}|${s.maxLives}|${s.armor}|${inv}|${s.level}|${s.xp}|${s.steps}`;
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
    this.biomes.scroll(dy);
  }

  update(time, delta) {
    if (this.paused || this.dead) return;
    const dt = clampDelta(delta);
    this.elapsedSec += dt / 1000;
    this.bosses.step(); // етап забігу, зміна біому, плашка й поява боса
    this.currentScroll = scrollSpeed(this.elapsedSec, this.bossActive);
    const dy = (this.currentScroll * dt) / 1000;
    this.distancePx += dy;
    this.applyStatus();
    this.player.step(dt);
    this.weaponView.update();
    this.scrollObjects(dy);
    this.biomes.step(dt, dy);
    this.spawner.spawnSpikes();
    this.spawnEnemies();
    this.autoFire(dt);
    for (const f of this.hats) f.step(dt);
    this.loot.oksana?.step(dt);
    this.miniAxe?.step(dt);
    this.loot.step();
    this.stepShield();
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

  /** Шляпи на голові: кількість і шкода — за взяттями картки. */
  syncHats() {
    const st = hatStats(this.progression.picks.hat ?? 0);
    const H = BALANCE.skills.hat;
    while (this.hats.length < st.count) {
      const i = this.hats.length;
      this.hats.push(
        new Familiar(this, {
          texture: 'hat',
          offset: { x: 0, y: HAT_Y - i * HAT_STACK }, // друга — на першій
          speed: H.speed,
          restMs: H.restMs,
          spin: true,
          damage: () => hatStats(this.progression.picks.hat ?? 0).damage,
        }),
      );
    }
  }

  /** Короткий напис над слизаком, що спливає й тане. */
  floatText(text, color) {
    const t = this.add.text(this.player.x, this.player.y - 30, text, { fontFamily: 'monospace', fontSize: '22px', color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
}
