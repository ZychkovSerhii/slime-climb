import { BALANCE } from '../config/balance.js';
import { abilityCharge, abilityReady, formAbilities, useAbility } from '../systems/Forms.js';
import { inFormButton } from '../systems/Layout.js';
import { sfx } from '../systems/Audio.js';
import FriendlySpider from '../entities/FriendlySpider.js';
import RideTrain from '../entities/RideTrain.js';

const LABELS = { swarm: 'РІЙ', train: 'ПОТЯГ', clones: 'КЛОНИ' };
const GRACE_MS = 500; // після поїздки — ще трохи невразливості, щоб зорієнтуватись

/**
 * Кнопки трансформацій (фідбек-8, scene.forms): рій павучків («Ти став павуком»), паровоз («Я ШКОДЬКО»),
 * клони («Я КОЛЯ»). Кнопки малює й ловить HUD (подія 'skill:form' з id). Клонів читає Combat (стріляють як ти).
 * Від сцени бере: progression, player, health, nowMs, paused, dead, scale, enemies, enemyProjectiles, events,
 * visibleEnemies, emitHud, add, tweens.
 */
export default class FormSkills {
  constructor(scene) {
    this.scene = scene;
    this.cd = {};
    this.spiders = [];
    this.ride = null;
    this.clones = null; // { until, sprites }
  }

  bind(shutdownEvent) {
    const scene = this.scene;
    const onForm = (id) => this.use(id);
    scene.events.on('skill:form', onForm);
    scene.events.once(shutdownEvent, () => scene.events.off('skill:form', onForm));
  }

  abilities() {
    return formAbilities(this.scene.progression);
  }

  /** Стан кнопок для HUD: [{ id, label, charge, active }] або null. */
  hud() {
    const list = this.abilities();
    if (!list.length) return null;
    const now = this.scene.nowMs;
    return list.map((id) => ({ id, label: LABELS[id], charge: abilityCharge(this.cd, id, now), active: this.isActive(id) }));
  }

  isActive(id) {
    if (id === 'swarm') return this.spiders.length > 0;
    if (id === 'train') return Boolean(this.ride);
    return Boolean(this.clones);
  }

  use(id) {
    const scene = this.scene;
    if (scene.paused || scene.dead || !this.abilities().includes(id)) return;
    if (!abilityReady(this.cd, id, scene.nowMs)) return;
    this.cd = useAbility(this.cd, id, scene.nowMs);
    if (id === 'swarm') this.startSwarm();
    if (id === 'train') this.startRide();
    if (id === 'clones') this.startClones();
    scene.emitHud();
  }

  startSwarm() {
    const s = this.scene;
    const p = s.player;
    for (const sp of this.spiders) sp.destroy();
    this.spiders = [];
    for (let i = 0; i < BALANCE.forms.swarm.count; i++) {
      const a = (i * Math.PI * 2) / BALANCE.forms.swarm.count;
      this.spiders.push(new FriendlySpider(s, p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, i));
    }
    sfx('swarm');
    s.floatText('Рій!', '#9cff57');
  }

  startRide() {
    const s = this.scene;
    this.ride?.destroy();
    this.ride = new RideTrain(s, s.player.texture.key);
    s.tweens.killTweensOf(s.player); // блимання після удару інакше перекриває прозорість на час поїздки
    s.health = { ...s.health, invulnerableUntil: Math.max(s.health.invulnerableUntil, s.nowMs + BALANCE.forms.train.ms + GRACE_MS) };
    s.floatText('Чух-чух!', '#ffd84a');
  }

  startClones() {
    const s = this.scene;
    const C = BALANCE.forms.clones;
    this.clearClones();
    const p = s.player;
    const sprites = [-C.dyPx, C.dyPx].map((dy) => {
      const c = s.add.sprite(p.x, p.y + dy, p.texture.key, p.frame.name).setDepth(p.depth - 0.5).setAlpha(C.alpha);
      c.dy = dy;
      return c;
    });
    this.clones = { until: s.nowMs + C.ms, sprites };
    sfx('squelch');
    s.floatText('Я КОЛЯ: клони!', '#ffb0c8');
  }

  clearClones() {
    for (const c of this.clones?.sprites ?? []) c.destroy();
    this.clones = null;
  }

  /** Хто ще стріляє разом зі слизаком (Combat.autoFire). */
  shooters() {
    return this.clones ? this.clones.sprites : [];
  }

  riding() {
    return Boolean(this.ride);
  }

  /** Щокадру (після applyStatus: прозорість слизака під час поїздки задаємо тут). */
  step(dt) {
    const s = this.scene;
    if (this.spiders.length) {
      const targets = s.visibleEnemies();
      this.spiders = this.spiders.filter((sp) => sp.step(dt, targets));
    }
    if (this.ride) {
      const going = this.ride.step(dt, s.enemies.getChildren());
      s.player.setAlpha(going ? 0 : 1);
      if (!going) this.ride = null;
    }
    if (this.clones) {
      if (s.nowMs >= this.clones.until) this.clearClones();
      else {
        const p = s.player;
        for (const c of this.clones.sprites) {
          c.setTexture(p.texture.key, p.frame.name).setPosition(p.x, p.y + c.dy).setFlip(p.flipX, p.flipY).setScale(p.scaleX, p.scaleY);
          c.setAlpha(BALANCE.forms.clones.alpha);
        }
      }
    }
  }

  /** Тап по кнопці трансформації — не стрибок; у паровозі слизак не стрибає взагалі. */
  blocksTap(x, y) {
    if (this.ride) return true;
    const { width, height } = this.scene.scale;
    return this.abilities().some((_, i) => inFormButton(i, x, y, width, height));
  }
}
