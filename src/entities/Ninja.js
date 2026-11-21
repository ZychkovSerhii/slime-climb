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
 * весь дим — нешкідливий. Потім кидає 1 сюрикен у гравця, через teleportMs
 * переноситься в диму на протилежну стіну і там через stayMs зникає.
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
    this.teleportAt = Infinity; // фідбек-6 п.10: після кидка — стрибок у диму на протилежну стіну
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
    if (now >= this.teleportAt) this.teleport(now);
    if (now >= this.goneAt) this.vanish();
  }

  /**
   * Фідбек-6 п.10: через teleportMs після кидка зникає в диму й з'являється на протилежній стіні на тій самій висоті.
   * Там лише ціль: не кидає вдруге й не шкодить дотиком (стіна могла бути стіною гравця), через stayMs зникає.
   */
  teleport(now) {
    const scene = this.scene;
    this.teleportAt = Infinity;
    this.puff(this.x, this.y);
    const w = scene.textures.getFrame('ninja').width;
    this.side = this.side === 'left' ? 'right' : 'left';
    const x = this.side === 'left' ? BALANCE.wallWidth + w / 2 : scene.scale.width - BALANCE.wallWidth - w / 2;
    this.setPosition(x, this.y).setFlipX(this.side === 'right');
    this.body.reset(x, this.y);
    this.puff(x, this.y);
    this.harmless = true;
    this.teleported = true;
    this.goneAt = now + CFG.stayMs;
    this.play(animKey('ninja', 'idle'));
  }

  puff(x, y) {
    const scene = this.scene;
    const p = scene.add.sprite(x, y, 'smoke').setDepth(this.depth + 1);
    p.play(animKey('smoke', 'puff'));
    scene.tweens.add({ targets: p, alpha: 0, duration: 400, onComplete: () => p.destroy() });
    sfx('poof');
  }

  throwShuriken(now) {
    const scene = this.scene;
    this.thrown = true;
    this.harmless = false;
    this.teleportAt = now + CFG.teleportMs + ((this.trait?.shurikens ?? 1) - 1) * (this.trait?.gapMs ?? 0);
    this.smoke?.destroy();
    this.smoke = null;
    this.play(animKey('ninja', 'throw'));
    this.shuriken();
    // посилений (коло 1+, етап 10): ще сюрикени з кроком gapMs (стіна ніндзі вільна довше — SpawnDirector.stepNinja)
    const t = this.trait;
    for (let i = 1; i < (t?.shurikens ?? 1); i++) {
      scene.time.delayedCall(t.gapMs * i, () => {
        if (this.active) this.shuriken();
      });
    }
  }

  shuriken() {
    const scene = this.scene;
    const s = new Shuriken(scene, this.x, this.y).setScale(CFG.shurikenScale);
    scene.enemyProjectiles.add(s);
    s.launch(scene.player.x, scene.player.y, CFG.shurikenSpeed);
    sfx('throw');
  }

  /** Зникає в диму: без нагороди. */
  vanish() {
    this.puff(this.x, this.y);
    this.destroy();
  }

  destroy(fromScene) {
    this.smoke?.destroy();
    this.smoke = null;
    super.destroy(fromScene);
  }
}
