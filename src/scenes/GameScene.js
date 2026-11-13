import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { scrollSpeed } from '../systems/Difficulty.js';
import { createSpawnState, dueSpawns } from '../systems/Spawner.js';
import { afterBossSpawnMul, bannerVisible, hazardsSuppressed } from '../systems/BossPlanner.js';
import { biomeIndex, familiarDamage, firstSegment, nextSegment, runStage } from '../systems/Cycle.js';
import { createStatus, fireIntervalMul, isPoisoned, isRoared, playerSpeedMul, poison, roar } from '../systems/Status.js';
import { createGiftState, createSantaState, giftDue, giftX, giftXp, penguinHp, rollGift, santaDue, xpToLevelUp } from '../systems/Biome.js';
import { ninjaInterval, otherSide, spikesBlock } from '../systems/WallWalkers.js';
import { ninjaDodgeWindow, ninjaY } from '../systems/Bamboo.js';
import { loadSettings } from '../systems/Settings.js';
import { addXp, applyCard, cardUpgrade, createProgression, killXp, rollLevelUp, weaponCard, weaponUpgrades, xpToNext } from '../systems/Progression.js';
import { attackDamage, axeRadius, axeTier, createFireState, hasMiniAxe, inRadius, shotgunAngles, stepFire, weaponJumpMul } from '../systems/Weapons.js';
import { clampDelta } from '../systems/Time.js';
import { applyDamage, createHealth, heal, healForLevels } from '../systems/Health.js';
import {
  activateInvis, breakArmor, cardLoot, createArmor, createInvis, hatStats, hitEffects, invisCharge, invisStats,
  isInvisible, jumpMul, maxLivesFor, rollLoot, stepArmor,
} from '../systems/Skills.js';
import { inInvisButton, inPauseButton } from '../systems/Layout.js';
import Familiar from '../entities/Familiar.js';
import { createSpikeState, planSpikes, prefillStartWorld, reserveFree, skipSpikes } from '../systems/SpikePlanner.js';
import { heightPoints, killPoints } from '../systems/Score.js';
import { loadMeta, recordKill, saveMeta, skinSprite, stepsForKill } from '../systems/Meta.js';
import { browserStorage } from '../systems/HighScore.js';
import { interceptPoint, pickNearest } from '../systems/Targeting.js';
import { playMusic, sfx, stopMusic } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Player from '../entities/Player.js';
import Spike from '../entities/Spike.js';
import Projectile from '../entities/Projectile.js';
import Lion from '../entities/Lion.js';
import Bat from '../entities/Bat.js';
import Plant from '../entities/Plant.js';
import SpiderBoss from '../entities/SpiderBoss.js';
import ShkodkoBoss from '../entities/ShkodkoBoss.js';
import KolyaBoss from '../entities/KolyaBoss.js';
import BearBoss from '../entities/BearBoss.js';
import BiomeDirector from '../game/BiomeDirector.js';
import PauseController from '../game/PauseController.js';
import WeaponView from '../entities/WeaponView.js';
import Elf from '../entities/Elf.js';
import Penguin from '../entities/Penguin.js';
import Santa from '../entities/Santa.js';
import Gift from '../entities/Gift.js';
import Ninja from '../entities/Ninja.js';
import Lantern from '../entities/Lantern.js';
import KazanBoss from '../entities/KazanBoss.js';
import Salamander from '../entities/Salamander.js';
import Spark from '../entities/Spark.js';
import Sparkling from '../entities/Sparkling.js';
import LavaDrop from '../entities/LavaDrop.js';
import { dropPassWindow, dropSide, dropsAllowed, nextDropMs, salamanderDodgeWindow, sparkSplit } from '../systems/Lava.js';
import GiftBomb from '../entities/GiftBomb.js';
import HeartPickup from '../entities/HeartPickup.js';
import { createHeartState, heartDue, heartSide } from '../systems/Heart.js';
import {
  activeForm, bombTargets, formSkin, friendlyBombDamage, rollSack, sackSkillCard, SHKODKO_LOOT_IDS, stepTicker,
} from '../systems/ShkodkoLoot.js';
import { bossIntroInfo } from '../systems/BossIntro.js';
import { loadTuning, setTuning, tuning } from '../systems/Tuning.js';
import { isEligibleRun } from '../systems/LeaderboardRules.js';

import { canSplit, KOLYA_LOOT_IDS, lootShotDamage, lootStepsBonus, useSplit } from '../systems/KolyaLoot.js';
import { canBoil, KAZAN_LOOT_IDS, ladleDamage, ringVictims, useBoil } from '../systems/KazanLoot.js';

const POISON_TINT = 0xb0d040; // слизак і так зелений — під отрутою він темніший, болотний
const ROAR_TINT = 0x9fb4c8; // приголомшений ричанням — сірувато-блакитний
// глибини фону: фон −3, сніг −2 (Snow.js), стіни −1, усе інше 0
const FADE_MS = 600; // шипи й вороги плавно зникають перед босом
const VENOM_SHOT_TINT = 0x9cff3a; // постріли з «Ядовитою мордою» — кислотні
// шляпа на голові слизака: центр шляпи відносно центру слизака і зсув другої шляпи
const HAT_Y = -15;
const HAT_STACK = 12;
const OKSANA_TINT = 0xffa8d8; // Оксанка — рожевувата, щоб не плутати з ворожими павучками
const LARVA_SHOT_TINT = 0xb4ff8a; // плювок «Личинки-помічника» — зелений, як постріли слизака, а не рожевий ворожий
// Боси (етап 9 — третій): тип у події 'enemy:killed' → ключ відрізка, ім'я, клас, трофеї
const BOSS_OF_KILL = { boss: 'spider', shkodko: 'shkodko', kolya: 'kolya', bear: 'bear', kazan: 'kazan' };
const BOSSES = {
  spider: { name: BALANCE.boss.name, make: (s) => new SpiderBoss(s), loot: (relics) => rollLoot(relics, Math.random) },
  shkodko: { name: BALANCE.shkodko.name, make: (s) => new ShkodkoBoss(s), loot: (relics) => rollLoot(relics, Math.random, SHKODKO_LOOT_IDS, BALANCE.shkodkoLoot.offer) },
  kolya: { name: BALANCE.kolya.name, make: (s) => new KolyaBoss(s), loot: (relics) => rollLoot(relics, Math.random, KOLYA_LOOT_IDS, BALANCE.kolyaLoot.offer) },
  // етап 10: міні-бос без трофеїв (і без бонусу Шагів «трофеї вже твої»)
  bear: { name: BALANCE.bearBoss.name, make: (s) => new BearBoss(s), loot: null },
  kazan: { name: BALANCE.kazan.name, make: (s) => new KazanBoss(s), loot: (relics) => rollLoot(relics, Math.random, KAZAN_LOOT_IDS, BALANCE.kazanLoot.offer) }, // етап 11
};

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
    this.lootTitle = null; // заголовок вікна трофеїв: чий трофей
    this.sack = null; // «Мішок Шкодька»: спрайт за спиною слизака
    this.lootTicks = { sack: null, iamXp: null, iamBomb: null, larva: null }; // таймери карток Шкодька й Колі (stepTicker)
    this.larva = null; // «Личинка-помічник» (етап 9)
    this.kolyaSplit = null; // «Я КОЛЯ»: { usedAtLevel }
    this.kolyaCopies = []; // мінікопії після поділу
    this.kazanBoil = null; // «Я КАЗАН»: { usedAtLevel } (етап 11)
    this.ladle = null; // «Черпачок» (етап 11)
    this.ladleTick = null;
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
    this.spawnState = createSpawnState();
    // Коло біомів (етап 6b, systems/Cycle): відрізок — біом і бос наприкінці; етап рахує runStage
    // (calm → before/after → prep → fight). killedAtSec — секунда смерті попереднього боса (тиша й плавний спавн).
    // Перевірка: ?boss=1 — павучиха на 6-й с, ?winter=1 — зима без боса, ?shkodko=1 — зима і Шкодько на 6-й с,
    // ?bamboo=1 — бамбук без боса, ?kolya=1 — бамбук і Коля на 6-й с (етап 9);
    // ?lava=1 — лава без боса, ?kazan=1 — лава і Казан на 6-й с, ?loop=N — почати з кола N (етап 11).
    const q = new URLSearchParams(window.location.search);
    const start = ['kazan', 'lava', 'bear', 'kolya', 'bamboo', 'shkodko', 'winter'].find((k) => q.get(k) === '1') ?? (q.get('boss') === '1' ? 'spider' : 'cave');
    this.seg = firstSegment(start, Math.max(0, Math.min(9, parseInt(q.get('loop') ?? '0', 10) || 0)));
    this.walkerSeq = 0;
    this.walkerQueue = []; // ніндзя, що чекають, поки на їхній стіні розійдуться шипи (етап 9)
    this.loop = this.seg.loop; // номер кола з 0: вороги й боси міцніші (Enemy читає scene.loop)
    this.stage = 'before';
    this.bossSpawned = false;
    this.bannerShown = false;
    this.killedAtSec = null;
    this.status = createStatus();
    this.biome = 'cave';
    this.settings = loadSettings(browserStorage());
    this.dropAt = Infinity; // наступна лавова крапля (мс гри)
    this.salamanderWaiting = false; // саламандра чекає, поки звільниться стіна (фідбек-6)
    this.landedAt = -Infinity; // коли слизак востаннє приземлився (пільга від струменя саламандри)
    this.santaState = null;
    this.giftState = null;
    this.heartState = createHeartState(); // сердечка (етап 10)
    this.heartSeq = 0;
    // ?weapon=axe|chakra|shotgun — одразу з повністю вкачаною зброєю (для перевірки)
    this.debugWeapon = new URLSearchParams(window.location.search).get('weapon');
    // Планувальник шипів для обох стін разом (світові координати = distancePx)
    this.spikeState = null;
    // рослини сідають на місце чергового запланованого шипа — так на них теж діють правила проміжків
    this.pendingPlants = 0;

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
      if (type === 'spark') this.splitSpark(x, y);
      sfx('kill');
      this.killScore += killPoints(type);
      this.onMetaKill(type);
      if (BOSS_OF_KILL[type]) this.onBossKilled(type);
      // Санта дає рівень: рівно стільки досвіду, скільки бракує до наступного
      const xp = type === 'santa' ? xpToLevelUp(this.progression.xp, xpToNext(this.progression.level)) : killXp(type, { biome: this.biomeIdx });
      this.gainXp(xp);
    };
    const onPicked = (id) => this.onCardPicked(id);
    const onRage = () => playMusic('rage');
    const onInvis = () => this.useInvisibility();
    const onIntroClosed = () => this.onIntroClosed();
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
    this.spawnSpikes(); // шипи видно з першого кадру

    this.pause = new PauseController(this);
    // ?intro=1 — представлення павучихи одразу після старту (перевірка §9.3)
    if (q.get('intro') === '1') this.showIntro('spider', { music: false });
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

  // ---------- Представлення боса (етап 9, §9.3) ----------

  /** Пауза і сцена BossIntro. music — false для ?intro=1 (боса немає, бойова музика не потрібна). */
  showIntro(boss, { music = true } = {}) {
    const info = bossIntroInfo(boss, this.loop);
    this.introOpen = true;
    this.introMusic = music;
    this.setPaused(true);
    playMusic(info.music);
    this.scene.launch('BossIntro', info);
  }

  /** Представлення закрилось: graceMs без шкоди, бойова музика, гра йде (якщо не згорнута й не вікно рівня). */
  onIntroClosed() {
    if (!this.introOpen) return;
    this.introOpen = false;
    this.health = { ...this.health, invulnerableUntil: Math.max(this.health.invulnerableUntil, this.nowMs + BALANCE.bossIntro.graceMs) };
    this.inputBlockedUntil = this.game.loop.time + BALANCE.tapGuardMs; // дотик, що закрив представлення, — не стрибок
    if (this.introMusic) playMusic('boss');
    else stopMusic();
    if (this.levelUpQueue > 0 || this.lootCards) {
      this.openLevelUp();
      return;
    }
    if (!this.pause.overlayOpen) this.setPaused(false);
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
      this.splitIntoCopies();
      return false;
    }
    // «Я КАЗАН» (етап 11): раз за рівень замість втрати життя — щит і кільце лави
    if (activeForm(this.progression.relics) === 'iamkazan' && this.nowMs >= this.health.invulnerableUntil && canBoil(this.kazanBoil, this.progression.level)) {
      this.kazanBoil = useBoil(this.kazanBoil, this.progression.level);
      this.lavaRing();
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
        this.hazards.add(new Spike(this, side, y, this.biomes.spikeTexture(this.biome)));
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
    for (const group of [this.hazards, this.enemies, this.enemyProjectiles, this.pickups, this.bombs]) {
      for (const obj of group.getChildren().slice()) this.fadeOut(obj, group);
    }
  }

  /** Об'єкт плавно зникає: без нагород і зіткнень, але ще їде зі світом, поки не розтане. */
  fadeOut(obj, group) {
    group.remove(obj);
    if (obj.body) obj.body.enable = false;
    obj.setActive(false); // зупиняє preUpdate: рослина не стріляє, лев не стрибає
    this.fading.add(obj);
    this.tweens.add({ targets: obj, alpha: 0, duration: FADE_MS, onComplete: () => obj.destroy() });
  }

  showBossBanner() {
    this.bannerShown = true;
    sfx('bossAppear');
    const kind = this.seg.boss === 'bear' ? 'МІНІ-БОС' : 'БОС';
    this.events.emit('hud:banner', { text: `${kind}: ${BOSSES[this.seg.boss].name}`, ms: BALANCE.boss.bannerSec * 1000 });
  }

  startBoss() {
    this.bossSpawned = true;
    const boss = this.spawnEnemy(BOSSES[this.seg.boss].make(this));
    boss.emitHud();
    this.showIntro(this.seg.boss);
  }

  /**
   * Після боса: calmSec нічого небезпечного, далі вороги повертаються поступово. Наступний відрізок кола:
   * після павучихи — зима і Шкодько, після Шкодька — печера наступного кола (вороги й боси міцніші).
   */
  onBossKilled(type) {
    this.killedAtSec = this.elapsedSec;
    this.seg = nextSegment(this.seg, this.elapsedSec);
    this.loop = this.seg.loop;
    this.bossSpawned = false;
    this.bannerShown = false;
    this.clearBossAttacks();
    // унікальні картки боса: 2 з ще не взятих (кожна — раз за забіг). У Шкодька й Колі їх лише 2, тож на наступному колі
    // пропонується та, яку не взяли. Усе вже взято — +50% Шагів боса (§0). Ведмідь (етап 10) трофеїв не має.
    const boss = BOSSES[BOSS_OF_KILL[type]];
    if (boss.loot) {
      const loot = boss.loot(this.progression.relics);
      this.lootCards = loot.length ? loot : null;
      this.lootTitle = `Трофей: ${boss.name}`;
      const bonus = lootStepsBonus(stepsForKill(type), loot);
      if (bonus) {
        this.meta = { ...this.meta, steps: this.meta.steps + bonus };
        this.runSteps += bonus;
        saveMeta(this.storage, this.meta);
        this.floatText(`+${bonus} Шагів: трофеї вже твої`, '#f2c440');
      }
    }
    this.events.emit('hud:boss', null);
    playMusic('victory');
  }

  /**
   * Смерть боса (етап 10, §10.4, для всіх): зникають усі ворожі снаряди, бомби й прислужники боса (рій, малі слимаки,
   * миші й аура ведмедя), і bossKillGraceMs гравця нічого не б'є. Звичайні вороги лишаються.
   */
  clearBossAttacks() {
    for (const b of this.bombs.getChildren().slice()) b.destroy();
    for (const e of this.enemies.getChildren().slice()) if (e.kolyaMinion || e.bossMinion || e.kazanMinion) this.fadeOut(e, this.enemies);
    for (const p of this.enemyProjectiles.getChildren().slice()) this.fadeOut(p, this.enemyProjectiles);
    const until = this.nowMs + BALANCE.bossKillGraceMs;
    this.health = { ...this.health, invulnerableUntil: Math.max(this.health.invulnerableUntil, until) };
  }

  /** Ведмідь на 20% HP: 2 зимові летючі миші з верхніх кутів (прислужники — зникають разом з ним). */
  spawnBearBats() {
    const { width } = this.scale;
    const m = BALANCE.wallWidth + 30;
    for (let i = 0; i < BALANCE.bearBoss.bats; i++) {
      const bat = this.spawnEnemy(new Bat(this, { biome: 'winter', x: i % 2 ? width - m : m, y: -20 }));
      bat.bossMinion = true;
    }
    sfx('bossAppear');
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
      else if (type === 'bat') this.spawnEnemy(new Bat(this, { biome: this.biome }));
      else if (type === 'lantern') this.spawnEnemy(new Lantern(this));
      else if (type === 'ninja') this.requestNinja();
      else if (type === 'spark') this.spawnEnemy(new Spark(this));
      else if (type === 'salamander') this.requestSalamander();
      else if (type === 'plant') this.pendingPlants += 1;
      else if (type === 'elf') this.spawnEnemy(new Elf(this));
      else if (type === 'penguin') this.spawnPenguins();
    }
    this.stepWalkers();
    if (this.biome === 'winter') this.spawnWinterExtras();
    if (this.biome === 'lava') this.spawnLavaDrop();
    this.spawnHeart();
  }

  /**
   * Сердечко (етап 10, §10.5): з 1-ї хвилини раз на 20–70 с, якщо життя не повні; у бою — одне за бій.
   * Стіна — без шипа ближче spikeGapPx; там же резерв, щоб нові шипи не сіли поруч.
   */
  spawnHeart() {
    const fight = this.bossActive ? `${this.seg.boss}@${this.seg.atSec}` : null;
    if (!fight && hazardsSuppressed(this.stage)) return; // підготовка до боса і тиша після — без сердечок
    const r = heartDue(this.heartState, { tSec: this.elapsedSec, livesFull: this.health.lives >= this.maxLives, fight }, Math.random);
    if (!r.spawn) return;
    const y = -this.textures.getFrame('heart').height;
    const spikes = this.hazards.getChildren().filter((h) => h.active && h.side).map((h) => ({ side: h.side, y: h.y }));
    const side = heartSide(spikes, y, Math.random);
    if (!side) return; // обидві стіни зайняті — спробуємо наступного кадру
    this.heartState = r.state;
    const w = this.distancePx - y;
    const gap = BALANCE.heart.spikeGapPx;
    this.spikeState = reserveFree(this.spikeState, side, w - gap - BALANCE.spikeHeight, w + gap, this.distancePx, `heart${++this.heartSeq}`);
    this.pickups.add(new HeartPickup(this, side, y));
  }

  // ---------- Ніндзя в черзі (етап 9): з'являється, коли на його стіні біля гравця немає кілків ----------

  /**
   * Пінгвін (етап 10, §10.3): вгорі біля стіни, де гравця немає; посилений (коло 1+) — парою з різницею pairGapMs.
   */
  spawnPenguins() {
    const side = otherSide(this.player.side);
    this.spawnEnemy(new Penguin(this, side, penguinHp(Math.random)));
    const t = this.loop >= BALANCE.scaling.enhancedFromLoop ? BALANCE.traits.penguin : null;
    if (t) this.time.delayedCall(t.pairGapMs, () => {
      if (!this.dead && !hazardsSuppressed(this.stage)) this.spawnEnemy(new Penguin(this, side, penguinHp(Math.random)));
    });
  }

  /**
   * Ніндзя (етап 9) у чергу: не більше одного на екрані (і в черзі), на стіні, де гравця немає, і не на стіні ходока.
   * Від сюрикена ховаються на стіні ніндзі, тож резерв без шипів — на ній (див. WallWalkers.ninjaInterval).
   */
  requestNinja() {
    const busy = this.enemies.getChildren().some((e) => e.active && e.ninja) || this.walkerQueue.some((q) => q.type === 'ninja');
    if (busy) return;
    this.walkerQueue.push({ type: 'ninja', y: ninjaY(Math.random, this.scale.height), until: this.nowMs + BALANCE.wallWalk.maxWaitMs, id: `walk${++this.walkerSeq}` });
  }

  /**
   * Саламандра (етап 11, §11.2): як ніндзя — не більше однієї, на стіні, де гравця немає; від струменя рятує стрибок
   * на її стіну, тож там резерв без шипів (Lava.salamanderDodgeWindow). Поки летить крапля — не з'являється.
   */
  requestSalamander() {
    // фідбек-6: краплі (раз на ~7 с) займали стіни майже завжди, і саламандра за 80 с з'являлась один раз.
    // Тепер зайнято — вона чекає своєї черги, а наступна крапля поступається їй (spawnLavaDrop).
    if (this.lavaWallBusy) {
      this.salamanderWaiting = true;
      return;
    }
    this.salamanderWaiting = false;
    const S = BALANCE.enemies.salamander;
    const y = this.scale.height * (S.minYFrac + Math.random() * (S.maxYFrac - S.minYFrac));
    this.walkerQueue.push({ type: 'salamander', y, until: this.nowMs + BALANCE.wallWalk.maxWaitMs, id: `walk${++this.walkerSeq}` });
  }

  /** Активна лавова крапля або саламандра (жива чи в черзі): вони не з'являються одночасно (§11.2, ruling плану). */
  get lavaWallBusy() {
    return this.hazards.getChildren().some((h) => h.active && h.lavaDrop)
      || this.enemies.getChildren().some((e) => e.active && e.salamander)
      || this.walkerQueue.some((q) => q.type === 'salamander' || q.type === 'drop');
  }

  /**
   * Лавова крапля (етап 11): раз на everyMs ± jitter, не під час бою з Казаном і не разом із саламандрою.
   * Як ніндзя — через чергу: стіна краплі випадкова, протилежна резервується без шипів на час проходу краплі
   * повз гравця (Lava.dropPassWindow); крапля з'являється, коли там розійдуться шипи (не дочекалась — не з'являється).
   */
  spawnLavaDrop() {
    if (this.salamanderWaiting && !this.lavaWallBusy && !hazardsSuppressed(this.stage)) {
      this.requestSalamander(); // саламандра чекала — її черга, крапля зсувається
      this.dropAt = Math.max(this.dropAt, this.nowMs + BALANCE.lava.drop.everyMs / 2);
      return;
    }
    if (this.nowMs < this.dropAt) return;
    if (!dropsAllowed(this.bossActive) || hazardsSuppressed(this.stage) || this.lavaWallBusy) return;
    const dropSideNow = dropSide(Math.random, { left: false, right: false });
    this.walkerQueue.push({ type: 'drop', dropSide: dropSideNow, until: this.nowMs + BALANCE.wallWalk.maxWaitMs, id: `walk${++this.walkerSeq}` });
    this.dropAt = this.nowMs + nextDropMs(Math.random);
  }

  /** Убита іскра розпадається на дрібні (етап 11): віялом, не більше maxSmall на екрані. */
  splitSpark(x, y) {
    const alive = this.enemies.getChildren().filter((e) => e.active && e.sparkling).length;
    const n = sparkSplit(this.loop >= BALANCE.scaling.enhancedFromLoop, alive);
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) this.spawnEnemy(new Sparkling(this, x, y, base + (i * 2 * Math.PI) / n));
  }

  /** Крок ніндзі в черзі: true — ще чекає. */
  stepNinja(q, spikes) {
    // крапля (етап 11): вільною має лишитися стіна навпроти краплі; ніндзя й саламандра — стіна, де гравця немає
    const side = q.type === 'drop' ? otherSide(q.dropSide) : otherSide(this.player.side);
    if (q.side && q.side !== side) this.spikeState = reserveFree(this.spikeState, q.side, 0, -1, this.distancePx, q.id); // гравець перестрибнув
    q.side = side;
    const p = this.player;
    const dist = Math.hypot(this.scale.width - 2 * BALANCE.wallWidth, p.baseY - q.y);
    const scroll = scrollSpeed(this.elapsedSec, false);
    const enh = this.loop >= BALANCE.scaling.enhancedFromLoop;
    const t = enh ? BALANCE.traits.ninja : null;
    const extra = t ? ((t.shurikens - 1) * t.gapMs) / 1000 : 0;
    const win = q.type === 'salamander' ? salamanderDodgeWindow(enh) : q.type === 'drop' ? dropPassWindow(p.baseY) : ninjaDodgeWindow(dist, extra);
    const iv = ninjaInterval({ d0: this.distancePx, zoneY: p.baseY, scroll, ...win });
    // поки чекаємо: відрізок рухається разом із гравцем, тож резервуємо його з запасом на весь час очікування —
    // інакше нові шипи згори заходять у нього швидше, ніж старі виходять
    const waitSec = Math.max(q.until - this.nowMs, 0) / 1000;
    this.spikeState = reserveFree(this.spikeState, side, iv.from, iv.to + scroll * waitSec, this.distancePx, q.id);
    if (spikesBlock(spikes, side, iv, this.distancePx)) {
      if (this.nowMs < q.until) return true;
      this.spikeState = reserveFree(this.spikeState, side, 0, -1, this.distancePx, q.id);
      return false;
    }
    this.spikeState = reserveFree(this.spikeState, side, iv.from, iv.to, this.distancePx, q.id); // ніндзя з'явився — лише його вікно
    if (q.type === 'drop') this.hazards.add(new LavaDrop(this, q.dropSide));
    else this.spawnEnemy(q.type === 'salamander' ? new Salamander(this, side, q.y) : new Ninja(this, side, q.y));
    return false;
  }

  /** Щокадру: ніндзя в черзі чекають, поки на їхній стіні розійдуться шипи (не дочекався maxWaitMs — не з'являється). */
  stepWalkers() {
    if (!this.walkerQueue.length) return;
    if (hazardsSuppressed(this.stage)) {
      this.walkerQueue = [];
      return;
    }
    const spikes = this.hazards.getChildren().filter((h) => h.active && h.side).map((h) => ({ side: h.side, y: h.y }));
    this.walkerQueue = this.walkerQueue.filter((q) => this.stepNinja(q, spikes));
  }

  /** Зима: Санта (шанс щохвилини) і подарунки на траєкторії стрибка. */
  spawnWinterExtras() {
    const suppressed = hazardsSuppressed(this.stage);
    const s = santaDue(this.santaState, this.elapsedSec, Math.random, suppressed);
    this.santaState = s.state;
    if (s.spawn) {
      this.spawnEnemy(new Santa(this));
      sfx('jingle');
      this.events.emit('hud:banner', { text: 'Санта!', ms: 1200 });
    }
    const g = giftDue(this.giftState, this.nowMs, Math.random, suppressed);
    this.giftState = g.state;
    if (g.spawn) {
      const w = BALANCE.wallWidth;
      const gift = new Gift(this, giftX(Math.random, w, this.scale.width - w), -this.textures.getFrame('gift').height / 2);
      this.pickups.add(gift);
    }
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
    this.spawnState = createSpawnState(biome, startSec);
    const instant = from === biome || this.elapsedSec < 0.5;
    if (biome === 'winter') {
      this.santaState = createSantaState(startSec);
      this.giftState = createGiftState(startSec * 1000);
    }
    this.salamanderWaiting = false;
    this.dropAt = biome === 'lava' ? this.nowMs + BALANCE.lava.drop.firstMs + BALANCE.boss.calmSec * 1000 : Infinity;
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
    const stage = runStage(this.elapsedSec, this.seg, this.killedAtSec);
    if (stage !== this.stage) this.onStage(stage);
    if (this.seg.biome !== this.biome) this.enterBiome(this.seg.biome);
    if (this.seg.boss && !this.bannerShown && bannerVisible(this.elapsedSec, this.seg.atSec)) this.showBossBanner();
    if (stage === 'fight' && !this.bossSpawned) this.startBoss();
    this.currentScroll = scrollSpeed(this.elapsedSec, this.bossActive);
    const dy = (this.currentScroll * dt) / 1000;
    this.distancePx += dy;
    this.applyStatus();
    this.player.step(dt);
    this.weaponView.update();
    this.scrollObjects(dy);
    this.biomes.step(dt, dy);
    this.spawnSpikes();
    this.spawnEnemies();
    this.autoFire(dt);
    for (const f of this.hats) f.step(dt);
    this.oksana?.step(dt);
    this.miniAxe?.step(dt);
    this.stepShkodkoLoot();
    this.stepKolyaLoot();
    this.stepKazanLoot();
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
        // росте з «Уроном» і з біомом — тим самим множником, що й HP ворогів (фідбек-6)
        damage: () => familiarDamage(L.oksana.damage, this.weapon.damage, this.biomeIdx),
      });
    }
    // трансформації: діє остання взята (павук або Шкодько), скін — її
    if (id === 'form' || id === 'iam') this.player.setSkin(formSkin(this.progression.relics));
    if (id === 'iamkolya' || id === 'iamkazan') this.player.setSkin(formSkin(this.progression.relics));
    if (id === 'ladle' && !this.ladle) this.ladle = this.add.image(this.player.x, this.player.y, 'ladle').setDepth(this.player.depth + 1);
    if (id === 'sack' && !this.sack) this.sack = this.add.sprite(this.player.x, this.player.y, 'sack', 'sack').setDepth(this.player.depth - 1);
    if (id === 'larva' && !this.larva) this.larva = this.add.sprite(this.player.x, this.player.y, 'larva').setDepth(this.player.depth + 1);
    const names = {
      armor: 'Кожух з павучихи', venom: 'Ядовита морда', oksana: 'Оксанка з тобою', web: 'Дупа павучихи', form: 'Ти став павуком',
      sack: 'Мішок Шкодька', iam: 'Я ШКОДЬКО', larva: 'Личинка-помічник', iamkolya: 'Я КОЛЯ', ladle: 'Черпачок', iamkazan: 'Я КАЗАН',
    };
    this.events.emit('hud:banner', { text: names[id], ms: 1500 });
  }

  // ---------- Картки Шкодька (етап 6c) ----------

  /** Крок карток Шкодька: мішок (раз на sack.everyMs) і «Я ШКОДЬКО» (потік досвіду й бомб). Лише поза паузою. */
  stepShkodkoLoot() {
    const K = BALANCE.shkodkoLoot;
    const relics = this.progression.relics;
    const now = this.nowMs;
    const tick = (key, everyMs) => {
      const r = stepTicker(this.lootTicks[key], now, everyMs);
      this.lootTicks[key] = r.state;
      return r.count;
    };
    if (this.sack) {
      const p = this.player;
      this.sack.setPosition(p.x + (p.side === 'left' ? 14 : -14), p.y + 8).setFlipX(p.side !== 'left');
      for (let i = tick('sack', K.sack.everyMs); i > 0; i--) this.openSack();
    }
    if (activeForm(relics) === 'iam') {
      const xp = tick('iamXp', K.iam.xpEveryMs);
      if (xp) this.gainXp(xp * K.iam.xp);
      for (let i = tick('iamBomb', K.iam.bombEveryMs); i > 0; i--) this.throwFriendlyBombs(K.iam.bombs);
    } else {
      this.lootTicks.iamXp = null;
      this.lootTicks.iamBomb = null;
    }
  }

  /** Що випало з мішка. Немає цілей для бомб чи навички для прокачки — випадає досвід. */
  openSack() {
    const K = BALANCE.shkodkoLoot.sack;
    this.sack.play(animKey('sack', 'shake'));
    let kind = rollSack(Math.random);
    if (kind === 'bombs' && !this.throwFriendlyBombs(K.bombs)) kind = 'xp';
    if (kind === 'skill') {
      const card = sackSkillCard(this.progression, Math.random);
      if (card) {
        this.applyPicked(card);
        sfx('levelUp');
        this.events.emit('hud:banner', { text: 'Мішок Шкодька:\nнавичка +1', ms: 1400 });
      } else kind = 'xp';
    }
    if (kind === 'xp') {
      this.gainXp(K.xp);
      this.floatText(`+${K.xp} досвіду`, '#b4e06a');
    }
    if (kind === 'steps') {
      this.meta = { ...this.meta, steps: this.meta.steps + K.steps };
      this.runSteps += K.steps;
      saveMeta(this.storage, this.meta);
      this.floatText(`+${K.steps} Шаги`, '#f2c440');
    }
  }

  /** Свої бомби в n найближчих видимих ворогів. Повертає false, якщо цілей немає. */
  throwFriendlyBombs(n) {
    const targets = bombTargets(this.player, this.visibleEnemies(), n);
    if (!targets.length) return false;
    const damage = friendlyBombDamage(this.weapon.damage);
    const from = this.sack ?? this.player;
    for (const t of targets) this.friendlyBombs.add(new GiftBomb(this, from.x, from.y, t.x, t.y, { friendly: true, damage }));
    sfx('throw');
    return true;
  }

  // ---------- Картки Колі (етап 9) ----------

  /** «Личинка-помічник» плює раз на everyMs; мінікопії «Я КОЛЯ» стріляють, поки живі. */
  stepKolyaLoot() {
    const now = this.nowMs;
    const p = this.player;
    if (this.larva) {
      this.larva.setPosition(p.x + (p.side === 'left' ? 10 : -10), p.y - 26).setFlipX(p.side !== 'left');
      const L = BALANCE.kolyaLoot.larva;
      const r = stepTicker(this.lootTicks.larva, now, L.everyMs);
      this.lootTicks.larva = r.state;
      if (r.count && this.lootShot(this.larva, lootShotDamage(L.damage, this.weapon.damage), L.speed)) this.larva.play(animKey('larva', 'spit'));
    }
    if (!this.kolyaCopies.length) return;
    const I = BALANCE.kolyaLoot.iam;
    for (const c of this.kolyaCopies) {
      c.sprite.setPosition(p.x + c.dx * (p.side === 'left' ? 1 : -1), p.y + c.dy);
      if (now >= c.nextShotAt) {
        c.nextShotAt = now + I.copyEveryMs;
        this.lootShot(c.sprite, lootShotDamage(I.copyDamage, this.weapon.damage), BALANCE.projectileSpeed);
      }
    }
    if (now >= this.kolyaCopies[0].until) {
      for (const c of this.kolyaCopies) c.sprite.destroy();
      this.kolyaCopies = [];
    }
  }

  // ---------- Картки Казана (етап 11) ----------

  /** «Черпачок» кружляє довкола слизака і раз на everyMs хлюпає краплею лави в найближчого ворога. */
  stepKazanLoot() {
    if (!this.ladle) return;
    const L = BALANCE.kazanLoot.ladle;
    const now = this.nowMs;
    const a = (2 * Math.PI * now) / L.orbitMs;
    this.ladle.setPosition(this.player.x + Math.cos(a) * L.orbitPx, this.player.y + Math.sin(a) * L.orbitPx * 0.6);
    const r = stepTicker(this.ladleTick, now, L.everyMs);
    this.ladleTick = r.state;
    if (r.count) this.lootShot(this.ladle, ladleDamage(this.weapon.damage), L.speed, 'magma');
  }

  /** «Я КАЗАН»: замість втрати життя — щит invulnMs і кільце лави, що б'є ворогів у radiusPx. */
  lavaRing() {
    const I = BALANCE.kazanLoot.iam;
    const now = this.nowMs;
    this.health = { ...this.health, invulnerableUntil: Math.max(this.health.invulnerableUntil, now + I.invulnMs) };
    this.showShield(I.invulnMs);
    sfx('boom');
    const p = this.player;
    const ring = this.add.circle(p.x, p.y, I.radiusPx, 0xf06a1e, 0.35).setStrokeStyle(4, 0xffd25a, 0.9).setDepth(40);
    this.tweens.add({ targets: ring, alpha: 0, scale: 1.1, duration: 400, onComplete: () => ring.destroy() });
    for (const e of ringVictims(p, this.visibleEnemies())) e.takeHit(I.damage, null, now);
    this.events.emit('hud:banner', { text: 'Кришка!', ms: 900 });
  }

  /** Постріл помічника в найближчого видимого ворога. false — цілей немає. */
  lootShot(from, damage, speed, texture = 'slimeSpit') {
    const targets = this.visibleEnemies();
    if (!targets.length) return false;
    const t = pickNearest(from, targets);
    const proj = new Projectile(this, from.x, from.y, texture, { damage, fx: null }).setScale(0.7);
    if (texture === 'slimeSpit') proj.setTint(LARVA_SHOT_TINT); // магма черпачка — своїм кольором
    this.playerProjectiles.add(proj);
    proj.launch(t.x, t.y, speed);
    return true;
  }

  /** «Я КОЛЯ»: замість втрати життя — невразливість і мінікопії, що стріляють. */
  splitIntoCopies() {
    const I = BALANCE.kolyaLoot.iam;
    const now = this.nowMs;
    this.health = { ...this.health, invulnerableUntil: Math.max(this.health.invulnerableUntil, now + I.invulnMs) };
    this.showShield(I.invulnMs);
    for (const c of this.kolyaCopies) c.sprite.destroy();
    const spots = [{ dx: 44, dy: -40 }, { dx: 44, dy: 36 }, { dx: 80, dy: 0 }];
    this.kolyaCopies = spots.slice(0, I.copies).map((s, i) => ({
      ...s,
      sprite: this.add.sprite(this.player.x, this.player.y, 'slimeKolya').setScale(0.5).setDepth(this.player.depth + 1).play(animKey('slimeKolya', 'idle')),
      nextShotAt: now + i * (I.copyEveryMs / 2),
      until: now + I.copyMs,
    }));
    sfx('squelch');
    this.floatText('Я КОЛЯ: ділюся!', '#ffb0c8');
  }

  /** Короткий напис над слизаком, що спливає й тане. */
  floatText(text, color) {
    const t = this.add.text(this.player.x, this.player.y - 30, text, { fontFamily: 'monospace', fontSize: '22px', color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
}
