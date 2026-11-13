import { BALANCE } from '../config/balance.js';
import { scrollSpeed } from '../systems/Difficulty.js';
import { createSpawnState, dueSpawns } from '../systems/Spawner.js';
import { afterBossSpawnMul, hazardsSuppressed } from '../systems/BossPlanner.js';
import { createGiftState, createSantaState, giftDue, giftX, penguinHp, santaDue } from '../systems/Biome.js';
import { ninjaInterval, otherSide, spikesBlock } from '../systems/WallWalkers.js';
import { ninjaDodgeWindow, ninjaY } from '../systems/Bamboo.js';
import { createSpikeState, planSpikes, prefillStartWorld, reserveFree, skipSpikes } from '../systems/SpikePlanner.js';
import { dropPassWindow, dropSide, dropsAllowed, nextDropMs, salamanderDodgeWindow, sparkSplit } from '../systems/Lava.js';
import { createHeartState, heartDue, heartSide } from '../systems/Heart.js';
import { sfx } from '../systems/Audio.js';
import Spike from '../entities/Spike.js';
import Lion from '../entities/Lion.js';
import Bat from '../entities/Bat.js';
import Plant from '../entities/Plant.js';
import Elf from '../entities/Elf.js';
import Penguin from '../entities/Penguin.js';
import Santa from '../entities/Santa.js';
import Gift from '../entities/Gift.js';
import Ninja from '../entities/Ninja.js';
import Lantern from '../entities/Lantern.js';
import Salamander from '../entities/Salamander.js';
import Spark from '../entities/Spark.js';
import Sparkling from '../entities/Sparkling.js';
import LavaDrop from '../entities/LavaDrop.js';
import HeartPickup from '../entities/HeartPickup.js';

/**
 * Що й коли з'являється: шипи, звичайні вороги за розкладом, черга «ходоків» (ніндзя, саламандра, лавова крапля),
 * пінгвіни, Санта й подарунки зими, сердечка, уламки іскри. Увесь стан спавну живе тут (scene.spawner).
 * Боси, їхні прислужники (spawnBearBats) і сам spawnEnemy лишились у сцені — їх кличуть сутності.
 * Від сцени бере: player, biome, biomes, stage, bossActive, seg, loop, dead, elapsedSec, distancePx, nowMs, health,
 * maxLives, групи hazards / enemies / pickups, метод spawnEnemy, а також scale, textures, time, events.
 */
export default class SpawnDirector {
  constructor(scene) {
    this.scene = scene;
    this.spawnState = createSpawnState();
    // Планувальник шипів для обох стін разом (світові координати = distancePx)
    this.spikeState = null;
    // рослини сідають на місце чергового запланованого шипа — так на них теж діють правила проміжків
    this.pendingPlants = 0;
    this.walkerSeq = 0;
    this.walkerQueue = []; // ніндзя, що чекають, поки на їхній стіні розійдуться шипи (етап 9)
    this.dropAt = Infinity; // наступна лавова крапля (мс гри)
    this.salamanderWaiting = false; // саламандра чекає, поки звільниться стіна (фідбек-6)
    this.santaState = null;
    this.giftState = null;
    this.heartState = createHeartState(); // сердечка (етап 10)
    this.heartSeq = 0;
  }

  /** Новий біом: розклад ворогів з startSec, Санта й подарунки зими, перша лавова крапля (кличе GameScene.enterBiome). */
  onBiome(biome, startSec) {
    this.spawnState = createSpawnState(biome, startSec);
    if (biome === 'winter') {
      this.santaState = createSantaState(startSec);
      this.giftState = createGiftState(startSec * 1000);
    }
    this.salamanderWaiting = false;
    this.dropAt = biome === 'lava' ? this.scene.nowMs + BALANCE.lava.drop.firstMs + BALANCE.boss.calmSec * 1000 : Infinity;
  }

  /** Ставить шипи над екраном за планувальником (сусідні шипи обох стін розділені щонайменше spikeBand). */
  spawnSpikes() {
    const scene = this.scene;
    if (!this.spikeState) {
      // перший виклик: одразу заповнюємо екран, щоб не чекати перших шипів
      this.spikeState = createSpikeState(prefillStartWorld(scene.distancePx, scene.player.y), Math.random);
    }
    if (hazardsSuppressed(scene.stage)) {
      // біля боса шипів немає; план просто «проїжджає» цей відрізок, щоб потім не висипати пачку
      this.spikeState = skipSpikes(this.spikeState, scene.distancePx, scrollSpeed(scene.elapsedSec, false), Math.random);
      return;
    }
    // проміжки рахуємо за швидкістю БЕЗ сповільнення боса: шип, поставлений під час боса,
    // може доїхати до гравця вже після нього, на повній швидкості
    const r = planSpikes(this.spikeState, scene.distancePx, scrollSpeed(scene.elapsedSec, false), Math.random);
    this.spikeState = r.state;
    for (const { side, w } of r.spikes) {
      // центр шипа: над верхнім краєм + наскільки світ уже проїхав після точки w
      const y = -BALANCE.spikeHeight / 2 + (scene.distancePx - w);
      if (this.pendingPlants > 0) {
        this.pendingPlants -= 1;
        scene.spawnEnemy(new Plant(scene, side, y));
      } else {
        scene.hazards.add(new Spike(scene, side, y, scene.biomes.spikeTexture(scene.biome)));
      }
    }
  }

  /** Звичайні вороги за розкладом Spawner. */
  spawnEnemies() {
    const scene = this.scene;
    const mul = afterBossSpawnMul(scene.elapsedSec, scene.killedAtSec);
    const r = dueSpawns(this.spawnState, scene.elapsedSec, hazardsSuppressed(scene.stage), mul);
    this.spawnState = r.state;
    for (const type of r.spawn) {
      // лев біжить по стіні, де гравця НЕМАЄ: загроза — ривок, від якого можна відскочити,
      // а не удар знизу по власній стіні, коли згори йдуть шипи
      if (type === 'lion') scene.spawnEnemy(new Lion(scene, scene.player.side === 'left' ? 'right' : 'left'));
      else if (type === 'bat') scene.spawnEnemy(new Bat(scene, { biome: scene.biome }));
      else if (type === 'lantern') scene.spawnEnemy(new Lantern(scene));
      else if (type === 'ninja') this.requestNinja();
      else if (type === 'spark') scene.spawnEnemy(new Spark(scene));
      else if (type === 'salamander') this.requestSalamander();
      else if (type === 'plant') this.pendingPlants += 1;
      else if (type === 'elf') scene.spawnEnemy(new Elf(scene));
      else if (type === 'penguin') this.spawnPenguins();
    }
    this.stepWalkers();
    if (scene.biome === 'winter') this.spawnWinterExtras();
    if (scene.biome === 'lava') this.spawnLavaDrop();
    this.spawnHeart();
  }

  /**
   * Сердечко (етап 10, §10.5): з 1-ї хвилини раз на 20–70 с, якщо життя не повні; у бою — одне за бій.
   * Стіна — без шипа ближче spikeGapPx; там же резерв, щоб нові шипи не сіли поруч.
   */
  spawnHeart() {
    const scene = this.scene;
    const fight = scene.bossActive ? `${scene.seg.boss}@${scene.seg.atSec}` : null;
    if (!fight && hazardsSuppressed(scene.stage)) return; // підготовка до боса і тиша після — без сердечок
    const r = heartDue(this.heartState, { tSec: scene.elapsedSec, livesFull: scene.health.lives >= scene.maxLives, fight }, Math.random);
    if (!r.spawn) return;
    const y = -scene.textures.getFrame('heart').height;
    const spikes = scene.hazards.getChildren().filter((h) => h.active && h.side).map((h) => ({ side: h.side, y: h.y }));
    const side = heartSide(spikes, y, Math.random);
    if (!side) return; // обидві стіни зайняті — спробуємо наступного кадру
    this.heartState = r.state;
    const w = scene.distancePx - y;
    const gap = BALANCE.heart.spikeGapPx;
    this.spikeState = reserveFree(this.spikeState, side, w - gap - BALANCE.spikeHeight, w + gap, scene.distancePx, `heart${++this.heartSeq}`);
    scene.pickups.add(new HeartPickup(scene, side, y));
  }

  /**
   * Пінгвін (етап 10, §10.3): вгорі біля стіни, де гравця немає; посилений (коло 1+) — парою з різницею pairGapMs.
   */
  spawnPenguins() {
    const scene = this.scene;
    const side = otherSide(scene.player.side);
    scene.spawnEnemy(new Penguin(scene, side, penguinHp(Math.random)));
    const t = scene.loop >= BALANCE.scaling.enhancedFromLoop ? BALANCE.traits.penguin : null;
    if (t) scene.time.delayedCall(t.pairGapMs, () => {
      if (!scene.dead && !hazardsSuppressed(scene.stage)) scene.spawnEnemy(new Penguin(scene, side, penguinHp(Math.random)));
    });
  }

  /**
   * Ніндзя (етап 9) у чергу: не більше одного на екрані (і в черзі), на стіні, де гравця немає, і не на стіні ходока.
   * Від сюрикена ховаються на стіні ніндзі, тож резерв без шипів — на ній (див. WallWalkers.ninjaInterval).
   */
  requestNinja() {
    const scene = this.scene;
    const busy = scene.enemies.getChildren().some((e) => e.active && e.ninja) || this.walkerQueue.some((q) => q.type === 'ninja');
    if (busy) return;
    this.walkerQueue.push({ type: 'ninja', y: ninjaY(Math.random, scene.scale.height), until: scene.nowMs + BALANCE.wallWalk.maxWaitMs, id: `walk${++this.walkerSeq}` });
  }

  /**
   * Саламандра (етап 11, §11.2): як ніндзя — не більше однієї, на стіні, де гравця немає; від струменя рятує стрибок
   * на її стіну, тож там резерв без шипів (Lava.salamanderDodgeWindow). Поки летить крапля — не з'являється.
   */
  requestSalamander() {
    const scene = this.scene;
    // фідбек-6: краплі (раз на ~7 с) займали стіни майже завжди, і саламандра за 80 с з'являлась один раз.
    // Тепер зайнято — вона чекає своєї черги, а наступна крапля поступається їй (spawnLavaDrop).
    if (this.lavaWallBusy) {
      this.salamanderWaiting = true;
      return;
    }
    this.salamanderWaiting = false;
    const S = BALANCE.enemies.salamander;
    const y = scene.scale.height * (S.minYFrac + Math.random() * (S.maxYFrac - S.minYFrac));
    this.walkerQueue.push({ type: 'salamander', y, until: scene.nowMs + BALANCE.wallWalk.maxWaitMs, id: `walk${++this.walkerSeq}` });
  }

  /** Активна лавова крапля або саламандра (жива чи в черзі): вони не з'являються одночасно (§11.2, ruling плану). */
  get lavaWallBusy() {
    const scene = this.scene;
    return scene.hazards.getChildren().some((h) => h.active && h.lavaDrop)
      || scene.enemies.getChildren().some((e) => e.active && e.salamander)
      || this.walkerQueue.some((q) => q.type === 'salamander' || q.type === 'drop');
  }

  /**
   * Лавова крапля (етап 11): раз на everyMs ± jitter, не під час бою з Казаном і не разом із саламандрою.
   * Як ніндзя — через чергу: стіна краплі випадкова, протилежна резервується без шипів на час проходу краплі
   * повз гравця (Lava.dropPassWindow); крапля з'являється, коли там розійдуться шипи (не дочекалась — не з'являється).
   */
  spawnLavaDrop() {
    const scene = this.scene;
    if (this.salamanderWaiting && !this.lavaWallBusy && !hazardsSuppressed(scene.stage)) {
      this.requestSalamander(); // саламандра чекала — її черга, крапля зсувається
      this.dropAt = Math.max(this.dropAt, scene.nowMs + BALANCE.lava.drop.everyMs / 2);
      return;
    }
    if (scene.nowMs < this.dropAt) return;
    if (!dropsAllowed(scene.bossActive) || hazardsSuppressed(scene.stage) || this.lavaWallBusy) return;
    const dropSideNow = dropSide(Math.random, { left: false, right: false });
    this.walkerQueue.push({ type: 'drop', dropSide: dropSideNow, until: scene.nowMs + BALANCE.wallWalk.maxWaitMs, id: `walk${++this.walkerSeq}` });
    this.dropAt = scene.nowMs + nextDropMs(Math.random);
  }

  /** Убита іскра розпадається на дрібні (етап 11): віялом, не більше maxSmall на екрані. */
  splitSpark(x, y) {
    const scene = this.scene;
    const alive = scene.enemies.getChildren().filter((e) => e.active && e.sparkling).length;
    const n = sparkSplit(scene.loop >= BALANCE.scaling.enhancedFromLoop, alive);
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) scene.spawnEnemy(new Sparkling(scene, x, y, base + (i * 2 * Math.PI) / n));
  }

  /** Крок ніндзі в черзі: true — ще чекає. */
  stepNinja(q, spikes) {
    const scene = this.scene;
    // крапля (етап 11): вільною має лишитися стіна навпроти краплі; ніндзя й саламандра — стіна, де гравця немає
    const side = q.type === 'drop' ? otherSide(q.dropSide) : otherSide(scene.player.side);
    if (q.side && q.side !== side) this.spikeState = reserveFree(this.spikeState, q.side, 0, -1, scene.distancePx, q.id); // гравець перестрибнув
    q.side = side;
    const p = scene.player;
    const dist = Math.hypot(scene.scale.width - 2 * BALANCE.wallWidth, p.baseY - q.y);
    const scroll = scrollSpeed(scene.elapsedSec, false);
    const enh = scene.loop >= BALANCE.scaling.enhancedFromLoop;
    const t = enh ? BALANCE.traits.ninja : null;
    const extra = t ? ((t.shurikens - 1) * t.gapMs) / 1000 : 0;
    const win = q.type === 'salamander' ? salamanderDodgeWindow(enh) : q.type === 'drop' ? dropPassWindow(p.baseY) : ninjaDodgeWindow(dist, extra);
    const iv = ninjaInterval({ d0: scene.distancePx, zoneY: p.baseY, scroll, ...win });
    // поки чекаємо: відрізок рухається разом із гравцем, тож резервуємо його з запасом на весь час очікування —
    // інакше нові шипи згори заходять у нього швидше, ніж старі виходять
    const waitSec = Math.max(q.until - scene.nowMs, 0) / 1000;
    this.spikeState = reserveFree(this.spikeState, side, iv.from, iv.to + scroll * waitSec, scene.distancePx, q.id);
    if (spikesBlock(spikes, side, iv, scene.distancePx)) {
      if (scene.nowMs < q.until) return true;
      this.spikeState = reserveFree(this.spikeState, side, 0, -1, scene.distancePx, q.id);
      return false;
    }
    this.spikeState = reserveFree(this.spikeState, side, iv.from, iv.to, scene.distancePx, q.id); // ніндзя з'явився — лише його вікно
    if (q.type === 'drop') scene.hazards.add(new LavaDrop(scene, q.dropSide));
    else scene.spawnEnemy(q.type === 'salamander' ? new Salamander(scene, side, q.y) : new Ninja(scene, side, q.y));
    return false;
  }

  /** Щокадру: ніндзя в черзі чекають, поки на їхній стіні розійдуться шипи (не дочекався maxWaitMs — не з'являється). */
  stepWalkers() {
    const scene = this.scene;
    if (!this.walkerQueue.length) return;
    if (hazardsSuppressed(scene.stage)) {
      this.walkerQueue = [];
      return;
    }
    const spikes = scene.hazards.getChildren().filter((h) => h.active && h.side).map((h) => ({ side: h.side, y: h.y }));
    this.walkerQueue = this.walkerQueue.filter((q) => this.stepNinja(q, spikes));
  }

  /** Зима: Санта (шанс щохвилини) і подарунки на траєкторії стрибка. */
  spawnWinterExtras() {
    const scene = this.scene;
    const suppressed = hazardsSuppressed(scene.stage);
    const s = santaDue(this.santaState, scene.elapsedSec, Math.random, suppressed);
    this.santaState = s.state;
    if (s.spawn) {
      scene.spawnEnemy(new Santa(scene));
      sfx('jingle');
      scene.events.emit('hud:banner', { text: 'Санта!', ms: 1200 });
    }
    const g = giftDue(this.giftState, scene.nowMs, Math.random, suppressed);
    this.giftState = g.state;
    if (g.spawn) {
      const w = BALANCE.wallWidth;
      const gift = new Gift(scene, giftX(Math.random, w, scene.scale.width - w), -scene.textures.getFrame('gift').height / 2);
      scene.pickups.add(gift);
    }
  }
}
