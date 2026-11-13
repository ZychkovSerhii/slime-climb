import { BALANCE } from '../config/balance.js';
import { background } from '../art/textures.js';
import Snow from '../entities/Snow.js';
import Fog from '../entities/Fog.js';
import Embers from '../entities/Embers.js';

const BG_DEPTH = -3;
const WALL_DEPTH = -1;
const TEX = {
  cave: { bg: 'bg', wall: 'wall', spike: 'spike' },
  winter: { bg: 'bgWinter', wall: 'wallIce', spike: 'icicle' },
  bamboo: { bg: 'bgBamboo', wall: 'wallBamboo', spike: 'stake' },
  lava: { bg: 'bgLava', wall: 'wallLava', spike: 'basalt' },
};
const BIOME_BANNER = { winter: 'Зима', bamboo: 'Туманний бамбук', lava: 'Лавові надра' };

/**
 * Вигляд біому: фон, стіни, перехід між біомами, погода (сніг, туман, іскри).
 * Назва поточного біому лишається в scene.biome (її читають сутності), стан спавну — у GameScene.enterBiome.
 * Від сцени бере: scale, add, tweens, events, settings, loop.
 */
export default class BiomeDirector {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.snow = null;
    this.fog = null; // туман бамбука (етап 9)
    this.embers = null; // іскри лави (етап 11)
    // Фон біому між стінами: тайловий, їде повільніше за стіни (паралакс)
    const w = BALANCE.wallWidth;
    this.bgInfo = background('bg');
    this.bg = scene.add.tileSprite(width / 2, height / 2, width - 2 * w, height, 'bg').setDepth(BG_DEPTH);
    // Стіни — тайлові спрайти, «рух» імітується зсувом текстури.
    // walls — усе, що прокручується (на час переходу біому там і старі стіни), wallTiles — поточні [ліва, права].
    this.walls = scene.add.group();
    const left = scene.add.tileSprite(w / 2, height / 2, w, height, 'wall').setDepth(WALL_DEPTH);
    const right = scene.add.tileSprite(width - w / 2, height / 2, w, height, 'wall').setFlipX(true).setDepth(WALL_DEPTH);
    this.wallTiles = [left, right];
    this.walls.addMultiple([left, right]);
    this.bgTiles = scene.add.group([this.bg]);
  }

  /** Текстура шипа для біому (бурулька, кілок, базальт). */
  spikeTexture(biome) {
    return TEX[biome].spike;
  }

  /** Погода, фон і стіни нового біому; instant — без плавного переходу й плашки (старт забігу). */
  enter(biome, instant) {
    const scene = this.scene;
    if (biome === 'winter') {
      if (scene.settings.snow && !this.snow) this.snow = new Snow(scene);
    } else if (this.snow) {
      this.snow.destroy();
      this.snow = null;
    }
    // туман — лише в бамбуку (етап 9), вимикається в меню
    if (biome === 'bamboo' && scene.settings.fog && !this.fog) {
      this.fog = new Fog(scene);
      if (!instant) this.fog.fadeIn(BALANCE.bamboo.transitionMs);
    } else if (biome !== 'bamboo' && this.fog) {
      this.fog.destroy();
      this.fog = null;
    }
    // іскри — лише в лаві (етап 11), вимикаються в меню
    if (biome === 'lava' && scene.settings.embers && !this.embers) this.embers = new Embers(scene);
    else if (biome !== 'lava' && this.embers) {
      this.embers.destroy();
      this.embers = null;
    }
    this.swapTiles(TEX[biome], instant ? 0 : BALANCE.winter.transitionMs);
    if (!instant) scene.events.emit('hud:banner', { text: BIOME_BANNER[biome] ?? `Коло ${scene.loop + 1}`, ms: 1800 });
  }

  /** Нові фон і стіни проявляються поверх старих за ms, старі потім знищуються. */
  swapTiles(tex, ms) {
    const scene = this.scene;
    const make = (old, key) => {
      const t = scene.add.tileSprite(old.x, old.y, old.width, old.height, key).setFlipX(old.flipX).setDepth(old.depth);
      t.tilePositionY = old.tilePositionY;
      return t;
    };
    const fade = (old, next, group) => {
      group.add(next);
      if (ms <= 0) {
        group.remove(old, true, true);
        return;
      }
      next.setAlpha(0);
      scene.tweens.add({ targets: next, alpha: 1, duration: ms, onComplete: () => group.remove(old, true, true) });
    };
    const bg = make(this.bg, tex.bg);
    fade(this.bg, bg, this.bgTiles);
    this.bg = bg;
    this.bgInfo = background(tex.bg);
    const walls = this.wallTiles.map((old) => make(old, tex.wall));
    this.wallTiles.forEach((old, i) => fade(old, walls[i], this.walls));
    this.wallTiles = walls;
  }

  /** Прокрутка стін і фону (фон — з паралаксом). */
  scroll(dy) {
    for (const wall of this.walls.getChildren()) {
      wall.tilePositionY -= dy;
    }
    for (const bg of this.bgTiles.getChildren()) bg.tilePositionY -= dy * this.bgInfo.parallax;
  }

  /** Погода за кадр. */
  step(dt, dy) {
    this.snow?.step(dt, dy);
    this.fog?.step(dt, dy);
    this.embers?.step(dt, dy);
  }

  relayout() {
    const { width, height } = this.scene.scale;
    const w = BALANCE.wallWidth;
    const [left, right] = this.wallTiles;
    this.bg.setSize(width - 2 * w, height).setPosition(width / 2, height / 2);
    left.setSize(w, height).setPosition(w / 2, height / 2);
    right.setSize(w, height).setPosition(width - w / 2, height / 2);
    this.fog?.relayout();
  }
}
