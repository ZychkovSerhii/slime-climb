import { BALANCE } from '../config/balance.js';
import { ninjaVulnerable } from '../systems/Bamboo.js';
import { sfx } from '../systems/Audio.js';
import { animKey } from '../art/sprites/index.js';
import Enemy from './Enemy.js';
import Shuriken from './Shuriken.js';

const CFG = BALANCE.enemies.ninja;

/**
 * Ніндзя (бамбук, §9.1). З'являється в клубі диму на стіні side (де гравця немає) на висоті y екрана і тримається там
 * (scrollsWithWorld = false — чіпляється за стіну, світ їде повз). Дим smokeMs: перша половина — невразливий,
 * весь дим — нешкідливий. Потім кидає 1 сюрикен у гравця і через stayMs зникає в диму.
 * Убитий до кидка — кидка немає (Enemy.destroy зупиняє preUpdate).
 */
export default class Ninja extends Enemy {
  constructor(scene, side, y) {
    const tex = scene.textures.getFrame('ninja');
    const { width } = scene.scale;
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, y, 'ninja', 'ninja');
    this.side = side;
    this.ninja = true;
    this.scrollsWithWorld = false;
    this.setFlipX(side === 'right');
    this.bornAt = scene.nowMs;
    this.thrown = false;
    this.goneAt = Infinity;
    this.invulnerable = true;
    this.harmless = true;
    this.setAlpha(0);
    this.smoke = scene.add.sprite(x, y, 'smoke').setDepth(this.depth + 1);
    this.smoke.play(animKey('smoke', 'puff'));
    this.play(animKey('ninja', 'idle'));
    sfx('poof');
  }

  spawned() {
    this.body.setVelocity(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    const since = now - this.bornAt;
    this.body.setVelocity(0, 0);
    if (!this.thrown) {
      // у диму проявляється; з другої половини диму його вже можна збити
      this.setAlpha(Math.min(since / CFG.smokeMs, 1));
      if (this.invulnerable && ninjaVulnerable(since)) this.invulnerable = false;
      if (since >= CFG.smokeMs) this.throwShuriken(now);
      return;
    }
    if (now >= this.goneAt) this.vanish();
  }

  throwShuriken(now) {
    const scene = this.scene;
    this.thrown = true;
    this.harmless = false;
    this.goneAt = now + CFG.stayMs;
    this.smoke?.destroy();
    this.smoke = null;
    this.play(animKey('ninja', 'throw'));
    const s = new Shuriken(scene, this.x, this.y);
    scene.enemyProjectiles.add(s);
    s.launch(scene.player.x, scene.player.y, CFG.shurikenSpeed);
    sfx('throw');
  }

  /** Зникає в диму: без нагороди. */
  vanish() {
    const scene = this.scene;
    const puff = scene.add.sprite(this.x, this.y, 'smoke').setDepth(this.depth + 1);
    puff.play(animKey('smoke', 'puff'));
    scene.tweens.add({ targets: puff, alpha: 0, duration: 400, onComplete: () => puff.destroy() });
    sfx('poof');
    this.destroy();
  }

  destroy(fromScene) {
    this.smoke?.destroy();
    this.smoke = null;
    super.destroy(fromScene);
  }
}
