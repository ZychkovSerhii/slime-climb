import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { columnDanger, salamanderFires, salamanderTimeline } from '../systems/Lava.js';
import { sfx } from '../systems/Audio.js';
import { animKey, frameOf } from '../art/sprites/index.js';
import Enemy from './Enemy.js';

const CFG = BALANCE.enemies.salamander;
const WARN_ALPHA = 0.35;

/**
 * Саламандра (лава, §11.2; фідбек-9 — струмінь вертикальний). Вилазить із тріщини на стіні side (де гравця немає) на висоті y
 * і тримається там (scrollsWithWorld = false) — вище гравця. emergeMs — жевріє, невразлива перші півчасу; потім лінія-попередження
 * warnMs униз уздовж її стіни (від неї до низу екрана), потім breaths видихів по breathMs (між ними gapMs). Струмінь б'є слизака,
 * що стоїть на її стіні нижче за неї (Lava.columnDanger) — тобто туди не можна стрибати. Стіна гравця на цей час без шипів
 * (SpawnDirector резервує її, як навпроти лавової краплі). Убита до кінця лінії — видиху немає.
 */
export default class Salamander extends Enemy {
  constructor(scene, side, y) {
    const tex = scene.textures.getFrame('salamander');
    const { width } = scene.scale;
    const x = side === 'left' ? BALANCE.wallWidth + tex.width / 2 : width - BALANCE.wallWidth - tex.width / 2;
    super(scene, x, y, 'salamander', 'salamander');
    this.side = side;
    this.salamander = true;
    this.scrollsWithWorld = false;
    this.setFlipX(side === 'right');
    this.setFrame(frameOf('salamander', 'emerge'));
    this.tl = salamanderTimeline(!!this.trait);
    this.bornAt = scene.nowMs;
    this.invulnerable = true;
    this.harmless = true;
    this.state = 'emerge';
    this.breathsLeft = this.tl.breaths;
    this.nextAt = this.bornAt + this.tl.emergeMs;
    this.beam = null;
    sfx('fuse');
  }

  spawned() {
    this.body.setVelocity(0, 0);
  }

  /** Стовп уздовж стіни саламандри від неї до низу екрана: попередження (тьмяне) або струмінь. */
  showBeam(alpha) {
    const scene = this.scene;
    this.beamTop = this.y + this.displayHeight / 2;
    const len = scene.scale.height - this.beamTop;
    const x = this.x;
    // текстура 'beam' горизонтальна — повертаємо на 90°; displaySize — до повороту (довжина × товщина)
    if (!this.beam) this.beam = scene.add.image(x, this.beamTop + len / 2, 'beam').setDepth(this.depth + 1).setAngle(90);
    this.beam.setDisplaySize(len, CFG.beamHalfH * 2).setPosition(x, this.beamTop + len / 2).setAlpha(alpha);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body || !this.active) return;
    const scene = this.scene;
    const now = scene.nowMs;
    this.body.setVelocity(0, 0);
    if (this.state === 'emerge') {
      if (this.invulnerable && now - this.bornAt >= this.tl.emergeMs / 2) this.invulnerable = false;
      if (now >= this.nextAt) {
        this.state = 'warn';
        this.setFrame(frameOf('salamander', 'idle'));
        this.showBeam(WARN_ALPHA);
        this.nextAt = now + this.tl.warnMs;
      }
      return;
    }
    if (this.state === 'warn') {
      this.beam?.setAlpha(WARN_ALPHA * (0.6 + 0.4 * Math.abs(Math.sin(now / 90))));
      if (now >= this.nextAt && salamanderFires(null, this.tl)) this.breathe(now);
      return;
    }
    if (this.state === 'breath') {
      if (!scene.dead && columnDanger(scene.player, this.side, this.beamTop)) scene.hurtPlayer();
      if (now >= this.nextAt) {
        this.breathsLeft -= 1;
        this.beam?.setVisible(false);
        this.setFrame(frameOf('salamander', 'idle'));
        if (this.breathsLeft > 0) {
          this.state = 'gap';
          this.nextAt = now + this.tl.gapMs;
        } else {
          this.state = 'hide';
          this.nextAt = now + this.tl.hideMs;
        }
      }
      return;
    }
    if (this.state === 'gap' && now >= this.nextAt) this.breathe(now);
    if (this.state === 'hide' && now >= this.nextAt) this.vanish();
  }

  breathe(now) {
    this.state = 'breath';
    this.harmless = false;
    this.nextAt = now + this.tl.breathMs;
    this.play(animKey('salamander', 'breathe'));
    this.showBeam(1);
    this.beam.setVisible(true);
    sfx('boom');
  }

  /** Ховається в тріщину: без нагороди. */
  vanish() {
    const scene = this.scene;
    scene.tweens.add({ targets: this, alpha: 0, duration: 250, onComplete: () => this.destroy() });
    this.state = 'gone';
  }

  destroy(fromScene) {
    this.beam?.destroy();
    this.beam = null;
    super.destroy(fromScene);
  }
}
