import { BALANCE } from '../config/balance.js';
import { attackTimings, isRage, isSpitAttack, pickRageAt, pickStrikeX, shouldStartSwarm, spitAngles } from '../systems/BossPlanner.js';
import Projectile from './Projectile.js';
import { sfx } from '../systems/Audio.js';
import Enemy from './Enemy.js';
import Swarm from './Swarm.js';
import { animKey } from '../art/sprites/index.js';

const B = BALANCE.boss;
const WEB_COLOR = 0xdddddd;
const RAGE_TINT = 0xff8080; // «частково червоніє»: відтінок, а не суцільний червоний
const ARRIVE_PX = 6;

/**
 * Бос-павучиха «Твоя мамаша».
 * Фаза 1: enter (спуск до hangY) → telegraph (тінь у точці удару, павучиха зсувається туди)
 *   → strike (падає на павутині до висоти гравця) → retreat → rest → telegraph…
 * Фаза 2 (swarmAt HP, раз за бій): toCenter → swarm — невразлива по центру вгорі, розмахує лапами, випускає рій.
 *   Коли рій знищено — знову вразлива, назад до фази 1.
 * Лють (поріг випадковий у rageMin…rageMax): червонішає, атаки швидші; подія сцени 'boss:rage'.
 * Подія 'hud:boss' { hp, maxHp, name, invulnerable } — після влучань і змін фази.
 * Таймери — на часі гри (nowMs), тож пауза їх зупиняє.
 */
export default class SpiderBoss extends Enemy {
  constructor(scene) {
    const { width } = scene.scale;
    const tex = scene.textures.getFrame('spider');
    super(scene, width / 2, -tex.height / 2, 'spider', 'boss');
    this.scrollsWithWorld = false;
    this.maxHp = this.hp;
    this.halfW = tex.width / 2;
    this.rageAt = pickRageAt(Math.random);
    this.rage = false;
    this.swarmDone = false;
    this.attackNo = 0;

    this.web = scene.add.graphics().setDepth(this.depth - 1);
    this.shadow = scene.add.image(0, 0, 'shadow').setVisible(false);
    this.swarm = new Swarm(scene, () => this.endSwarm());
    this.state = 'enter';
    this.stateUntil = 0;
    this.play(animKey('spider', 'legs'));
  }

  get laneMin() {
    return BALANCE.wallWidth + this.halfW;
  }

  get laneMax() {
    return this.scene.scale.width - BALANCE.wallWidth - this.halfW;
  }

  setState(state, durationMs = 0) {
    this.state = state;
    this.stateUntil = this.scene.nowMs + durationMs;
  }

  emitHud() {
    this.scene.events.emit('hud:boss', { hp: this.hp, maxHp: this.maxHp, name: B.name, invulnerable: this.invulnerable });
  }

  takeHit(damage, slow, nowMs) {
    super.takeHit(damage, slow, nowMs);
    if (!this.active) return;
    if (shouldStartSwarm(this.hp, this.maxHp, this.swarmDone) && !this.invulnerable) this.startSwarmPhase();
    if (!this.rage && isRage(this.hp, this.maxHp, this.rageAt)) this.enterRage();
    this.emitHud();
  }

  startSwarmPhase() {
    this.invulnerable = true;
    this.shadow.setVisible(false);
    this.setState('toCenter');
  }

  /** Рій знищено: знову вразлива, коротка пауза — і далі фаза 1. */
  endSwarm() {
    if (!this.active) return;
    this.swarmDone = true;
    this.invulnerable = false;
    this.flail?.stop();
    this.flail = null;
    this.setAngle(0);
    this.setState('rest', this.timings().restMs);
    this.emitHud();
  }

  enterRage() {
    this.rage = true;
    this.setBaseTint(RAGE_TINT);
    this.scene.events.emit('boss:rage');
  }

  timings() {
    return attackTimings(this.rage);
  }

  /** Летить до точки (x, y) зі швидкістю speed; true — уже там. */
  moveTo(x, y, speed) {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= ARRIVE_PX) {
      this.setPosition(x, y);
      this.body.setVelocity(0, 0);
      return true;
    }
    this.body.setVelocity((dx / d) * speed, (dy / d) * speed);
    return false;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.body) return;
    const scene = this.scene;
    const now = scene.nowMs;
    const mul = this.speedMul(now);
    const T = this.timings();

    switch (this.state) {
      case 'enter':
        this.body.setVelocity(0, T.retreatSpeed * mul);
        if (this.y >= B.hangY) {
          this.y = B.hangY;
          this.startTelegraph();
        }
        break;
      case 'telegraph':
        if (now >= this.stateUntil) {
          this.x = this.strikeX;
          this.body.setVelocity(0, 0);
          this.setState('strike');
        }
        break;
      case 'strike':
        this.body.setVelocity(0, T.dropSpeed * mul);
        if (this.y >= scene.player.y) {
          this.y = scene.player.y;
          this.shadow.setVisible(false);
          this.setState('retreat');
        }
        break;
      case 'retreat':
        this.body.setVelocity(0, -T.retreatSpeed * mul);
        if (this.y <= B.hangY) {
          this.y = B.hangY;
          this.body.setVelocity(0, 0);
          this.setState('rest', T.restMs);
        }
        break;
      case 'rest':
        if (now >= this.stateUntil) this.nextAttack();
        break;
      case 'toCenter':
        if (this.moveTo(scene.scale.width / 2, B.hangY, B.retreatSpeed)) this.castSwarm();
        break;
      default:
        break;
    }
    this.swarm.update(delta);

    this.web.clear();
    this.web.lineStyle(3, WEB_COLOR, 0.8).lineBetween(this.x, 0, this.x, this.y);
  }

  /** По центру вгорі: біль, розмахування лапами — і рій. */
  castSwarm() {
    this.setState('swarm');
    sfx('bossPain');
    sfx('swarm');
    this.flail = this.scene.tweens.add({ targets: this, angle: { from: -9, to: 9 }, duration: 160, yoyo: true, repeat: -1 });
    this.swarm.launch(B.swarm.start, this.x, this.y + this.height / 2);
    this.emitHud();
  }

  /** Наступна атака: кожна spit.every-та — плювок павутиною, решта — удар. */
  nextAttack() {
    this.attackNo += 1;
    if (isSpitAttack(this.attackNo, this.rage)) this.spit();
    else this.startTelegraph();
  }

  /** Віяло грудок павутини в гравця; від них рятує стрибок на іншу стіну. Далі пауза recoverMs. */
  spit() {
    const scene = this.scene;
    const p = scene.player;
    const y = this.y + this.height / 3;
    const aim = Math.atan2(p.y - y, p.x - this.x);
    sfx('bossPain');
    for (const a of spitAngles(aim, this.rage)) {
      const ball = new Projectile(scene, this.x, y, 'webBall');
      ball.type = 'webBall';
      scene.enemyProjectiles.add(ball);
      ball.launch(this.x + Math.cos(a) * 100, y + Math.sin(a) * 100, B.spit.speed);
    }
    this.setState('rest', B.spit.recoverMs / (this.rage ? B.rageSpeedMul : 1));
  }

  startTelegraph() {
    const scene = this.scene;
    const T = this.timings();
    this.strikeX = pickStrikeX(scene.player.x, Math.random, this.laneMin, this.laneMax);
    this.shadow.setPosition(this.strikeX, scene.player.y).setVisible(true);
    // павучиха зсувається над точкою удару рівно за час попередження
    const dx = this.strikeX - this.x;
    this.body.setVelocity(dx / (T.telegraphMs / 1000), 0);
    this.setState('telegraph', T.telegraphMs);
  }

  destroy(fromScene) {
    this.flail?.stop();
    this.swarm?.destroy();
    this.web?.destroy();
    this.shadow?.destroy();
    super.destroy(fromScene);
  }
}
