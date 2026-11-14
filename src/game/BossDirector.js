import { BALANCE } from '../config/balance.js';
import { bannerVisible } from '../systems/BossPlanner.js';
import { nextSegment, runStage } from '../systems/Cycle.js';
import { rollLoot } from '../systems/Skills.js';
import { saveMeta, stepsForKill } from '../systems/Meta.js';
import { playMusic, sfx, stopMusic } from '../systems/Audio.js';
import { SHKODKO_LOOT_IDS } from '../systems/ShkodkoLoot.js';
import { KOLYA_LOOT_IDS, lootStepsBonus } from '../systems/KolyaLoot.js';
import { KAZAN_LOOT_IDS } from '../systems/KazanLoot.js';
import { bossIntroInfo } from '../systems/BossIntro.js';
import Bat from '../entities/Bat.js';
import SpiderBoss from '../entities/SpiderBoss.js';
import ShkodkoBoss from '../entities/ShkodkoBoss.js';
import KolyaBoss from '../entities/KolyaBoss.js';
import BearBoss from '../entities/BearBoss.js';
import KazanBoss from '../entities/KazanBoss.js';


// Боси (етап 9 — третій): тип у події 'enemy:killed' → ключ відрізка, ім'я, клас, трофеї
export const BOSS_OF_KILL = { boss: 'spider', shkodko: 'shkodko', kolya: 'kolya', bear: 'bear', kazan: 'kazan' };
const BOSSES = {
  spider: { name: BALANCE.boss.name, make: (s) => new SpiderBoss(s), loot: (relics) => rollLoot(relics, Math.random) },
  shkodko: { name: BALANCE.shkodko.name, make: (s) => new ShkodkoBoss(s), loot: (relics) => rollLoot(relics, Math.random, SHKODKO_LOOT_IDS, BALANCE.shkodkoLoot.offer) },
  kolya: { name: BALANCE.kolya.name, make: (s) => new KolyaBoss(s), loot: (relics) => rollLoot(relics, Math.random, KOLYA_LOOT_IDS, BALANCE.kolyaLoot.offer) },
  // етап 10: міні-бос без трофеїв (і без бонусу Шагів «трофеї вже твої»)
  bear: { name: BALANCE.bearBoss.name, make: (s) => new BearBoss(s), loot: null },
  kazan: { name: BALANCE.kazan.name, make: (s) => new KazanBoss(s), loot: (relics) => rollLoot(relics, Math.random, KAZAN_LOOT_IDS, BALANCE.kazanLoot.offer) }, // етап 11
};

/**
 * Боси забігу (scene.bosses): етапи навколо боса (тиша → підготовка → бій), плашка, поява й представлення,
 * смерть боса з трофеями й наступним відрізком кола, очищення його атак, миші ведмедя.
 * Тут живуть лише bossSpawned, bannerShown, introMusic. Стан кола (seg, loop, stage, killedAtSec), introOpen,
 * bossActive, lootCards / lootTitle і fadeOut лишились у сцені: їх читають сутності, спавн, пауза й бот.
 * Від сцени бере: ці поля, elapsedSec, nowMs, health, biome, progression, meta, storage, runSteps, levelUpQueue,
 * pause, spawner, групи hazards / enemies / enemyProjectiles / pickups / bombs, методи spawnEnemy, fadeOut, setPaused,
 * openLevelUp, enterBiome, floatText, а також scale, scene, events, game.
 */
export default class BossDirector {
  constructor(scene) {
    this.scene = scene;
    this.bossSpawned = false;
    this.bannerShown = false;
    this.introMusic = true;
  }

  /** Щокадру (на початку GameScene.update): етап забігу, зміна біому, плашка й поява боса. */
  step() {
    const scene = this.scene;
    const stage = runStage(scene.elapsedSec, scene.seg, scene.killedAtSec);
    if (stage !== scene.stage) this.onStage(stage);
    if (scene.seg.biome !== scene.biome) scene.enterBiome(scene.seg.biome);
    if (scene.seg.boss && !this.bannerShown && bannerVisible(scene.elapsedSec, scene.seg.atSec)) this.showBossBanner();
    if (stage === 'fight' && !this.bossSpawned) this.startBoss();
  }

  /** Пауза і сцена BossIntro. music — false для ?intro=1 (боса немає, бойова музика не потрібна). */
  showIntro(boss, { music = true } = {}) {
    const scene = this.scene;
    const info = bossIntroInfo(boss, scene.loop);
    scene.introOpen = true;
    this.introMusic = music;
    scene.setPaused(true);
    playMusic(info.music);
    scene.scene.launch('BossIntro', info);
  }

  /** Представлення закрилось: graceMs без шкоди, бойова музика, гра йде (якщо не згорнута й не вікно рівня). */
  onIntroClosed() {
    const scene = this.scene;
    if (!scene.introOpen) return;
    scene.introOpen = false;
    scene.health = { ...scene.health, invulnerableUntil: Math.max(scene.health.invulnerableUntil, scene.nowMs + BALANCE.bossIntro.graceMs) };
    scene.inputBlockedUntil = scene.game.loop.time + BALANCE.tapGuardMs; // дотик, що закрив представлення, — не стрибок
    if (this.introMusic) playMusic('boss');
    else stopMusic();
    if (scene.levelUpQueue > 0 || scene.lootCards) {
      scene.openLevelUp();
      return;
    }
    if (!scene.pause.overlayOpen) scene.setPaused(false);
  }

  /** Перехід між етапами забігу навколо боса. */
  onStage(stage) {
    const scene = this.scene;
    scene.stage = stage;
    if (stage === 'prep') this.clearMap();
  }

  /** Перед босом: шипи, звичайні вороги й їхні кулі плавно зникають (без нагород, без зіткнень). */
  clearMap() {
    const scene = this.scene;
    scene.spawner.pendingPlants = 0;
    for (const group of [scene.hazards, scene.enemies, scene.enemyProjectiles, scene.pickups, scene.bombs]) {
      for (const obj of group.getChildren().slice()) scene.fadeOut(obj, group);
    }
  }

  showBossBanner() {
    const scene = this.scene;
    this.bannerShown = true;
    sfx('bossAppear');
    const kind = scene.seg.boss === 'bear' ? 'МІНІ-БОС' : 'БОС';
    scene.events.emit('hud:banner', { text: `${kind}: ${BOSSES[scene.seg.boss].name}`, ms: BALANCE.boss.bannerSec * 1000 });
  }

  startBoss() {
    const scene = this.scene;
    this.bossSpawned = true;
    const boss = scene.spawnEnemy(BOSSES[scene.seg.boss].make(scene));
    boss.emitHud();
    this.showIntro(scene.seg.boss);
  }

  /**
   * Після боса: calmSec нічого небезпечного, далі вороги повертаються поступово. Наступний відрізок кола:
   * після павучихи — зима і Шкодько, після Шкодька — печера наступного кола (вороги й боси міцніші).
   */
  onBossKilled(type) {
    const scene = this.scene;
    scene.killedAtSec = scene.elapsedSec;
    scene.seg = nextSegment(scene.seg, scene.elapsedSec);
    scene.loop = scene.seg.loop;
    this.bossSpawned = false;
    this.bannerShown = false;
    this.clearBossAttacks();
    // унікальні картки боса: 2 з ще не взятих (кожна — раз за забіг). У Шкодька й Колі їх лише 2, тож на наступному колі
    // пропонується та, яку не взяли. Усе вже взято — +50% Шагів боса (§0). Ведмідь (етап 10) трофеїв не має.
    const boss = BOSSES[BOSS_OF_KILL[type]];
    if (boss.loot) {
      const loot = boss.loot(scene.progression.relics);
      scene.lootCards = loot.length ? loot : null;
      scene.lootTitle = `Трофей: ${boss.name}`;
      const bonus = lootStepsBonus(stepsForKill(type), loot);
      if (bonus) {
        scene.meta = { ...scene.meta, steps: scene.meta.steps + bonus };
        scene.runSteps += bonus;
        saveMeta(scene.storage, scene.meta);
        scene.floatText(`+${bonus} Шагів: трофеї вже твої`, '#f2c440');
      }
    }
    scene.events.emit('hud:boss', null);
    playMusic('victory');
  }

  /**
   * Смерть боса (етап 10, §10.4, для всіх): зникають усі ворожі снаряди, бомби й прислужники боса (рій, малі слимаки,
   * миші й аура ведмедя), і bossKillGraceMs гравця нічого не б'є. Звичайні вороги лишаються.
   */
  clearBossAttacks() {
    const scene = this.scene;
    for (const b of scene.bombs.getChildren().slice()) b.destroy();
    for (const e of scene.enemies.getChildren().slice()) if (e.kolyaMinion || e.bossMinion || e.kazanMinion) scene.fadeOut(e, scene.enemies);
    for (const p of scene.enemyProjectiles.getChildren().slice()) scene.fadeOut(p, scene.enemyProjectiles);
    const until = scene.nowMs + BALANCE.bossKillGraceMs;
    scene.health = { ...scene.health, invulnerableUntil: Math.max(scene.health.invulnerableUntil, until) };
  }

  /** Ведмідь на 20% HP: 2 зимові летючі миші з верхніх кутів (прислужники — зникають разом з ним). */
  spawnBearBats() {
    const scene = this.scene;
    const { width } = scene.scale;
    const m = BALANCE.wallWidth + 30;
    for (let i = 0; i < BALANCE.bearBoss.bats; i++) {
      const bat = scene.spawnEnemy(new Bat(scene, { biome: 'winter', x: i % 2 ? width - m : m, y: -20 }));
      bat.bossMinion = true;
    }
    sfx('bossAppear');
  }
}
