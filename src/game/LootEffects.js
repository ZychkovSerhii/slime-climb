import { BALANCE } from '../config/balance.js';
import { animKey } from '../art/sprites/index.js';
import { sfx } from '../systems/Audio.js';
import { familiarDamage } from '../systems/Cycle.js';
import { saveMeta } from '../systems/Meta.js';
import { createArmor } from '../systems/Skills.js';
import { activeForm, bombTargets, formSkin, friendlyBombDamage, rollSack, sackSkillCard, stepTicker } from '../systems/ShkodkoLoot.js';
import { lootShotDamage } from '../systems/KolyaLoot.js';
import { ladleDamage, ringVictims } from '../systems/KazanLoot.js';
import { pickNearest } from '../systems/Targeting.js';
import Familiar from '../entities/Familiar.js';
import GiftBomb from '../entities/GiftBomb.js';
import Projectile from '../entities/Projectile.js';

const OKSANA_TINT = 0xffa8d8; // Оксанка — рожевувата, щоб не плутати з ворожими павучками
const LARVA_SHOT_TINT = 0xb4ff8a; // плювок «Личинки-помічника» — зелений, як постріли слизака, а не рожевий ворожий

/**
 * Ефекти трофеїв босів: Оксанка, мішок і «Я ШКОДЬКО», личинка й мінікопії «Я КОЛЯ», черпачок і кільце «Я КАЗАН».
 * Кожух (scene.armor) і лічильники «раз за рівень» (kolyaSplit, kazanBoil) лишились у сцені — їх читає hurtPlayer і HUD.
 * Від сцени бере: player, progression, weapon, biomeIdx, nowMs, health, meta, runSteps, storage, групи playerProjectiles і
 * friendlyBombs, методи gainXp, applyPicked, floatText, showShield, visibleEnemies, а також add, tweens, events.
 */
export default class LootEffects {
  constructor(scene) {
    this.scene = scene;
    this.oksana = null;
    this.sack = null; // «Мішок Шкодька»: спрайт за спиною слизака
    this.lootTicks = { sack: null, iamXp: null, iamBomb: null, larva: null }; // таймери карток Шкодька й Колі (stepTicker)
    this.larva = null; // «Личинка-помічник» (етап 9)
    this.kolyaCopies = []; // мінікопії після поділу
    this.ladle = null; // «Черпачок» (етап 11)
    this.ladleTick = null;
  }

  /** Крок усіх трофеїв за кадр, у тому ж порядку, що був у GameScene.update. Оксанку сцена кличе окремо (перед сокиркою). */
  step() {
    this.stepShkodkoLoot();
    this.stepKolyaLoot();
    this.stepKazanLoot();
  }

  /** Трофей павучихи взято: вмикаємо його ефект. */
  onLoot(id) {
    const s = this.scene;
    const L = BALANCE.bossLoot;
    if (id === 'armor' && !s.armor) s.armor = createArmor();
    if (id === 'oksana' && !this.oksana) {
      this.oksana = new Familiar(s, {
        texture: 'smallSpider',
        anim: 'crawl',
        tint: OKSANA_TINT,
        offset: { x: 30, y: 26 },
        speed: L.oksana.speed,
        restMs: L.oksana.intervalMs,
        // росте з «Уроном» і з біомом — тим самим множником, що й HP ворогів (фідбек-6)
        damage: () => familiarDamage(L.oksana.damage, s.weapon.damage, s.biomeIdx),
      });
    }
    // трансформації: діє остання взята (павук або Шкодько), скін — її
    if (id === 'form' || id === 'iam') s.player.setSkin(formSkin(s.progression.relics));
    if (id === 'iamkolya' || id === 'iamkazan') s.player.setSkin(formSkin(s.progression.relics));
    if (id === 'ladle' && !this.ladle) this.ladle = s.add.image(s.player.x, s.player.y, 'ladle').setDepth(s.player.depth + 1);
    if (id === 'sack' && !this.sack) this.sack = s.add.sprite(s.player.x, s.player.y, 'sack', 'sack').setDepth(s.player.depth - 1);
    if (id === 'larva' && !this.larva) this.larva = s.add.sprite(s.player.x, s.player.y, 'larva').setDepth(s.player.depth + 1);
    const names = {
      armor: 'Кожух з павучихи', venom: 'Ядовита морда', oksana: 'Оксанка з тобою', web: 'Дупа павучихи', form: 'Ти став павуком',
      sack: 'Мішок Шкодька', iam: 'Я ШКОДЬКО', larva: 'Личинка-помічник', iamkolya: 'Я КОЛЯ', ladle: 'Черпачок', iamkazan: 'Я КАЗАН',
    };
    s.events.emit('hud:banner', { text: names[id], ms: 1500 });
  }

  // ---------- Картки Шкодька (етап 6c) ----------

  /** Крок карток Шкодька: мішок (раз на sack.everyMs) і «Я ШКОДЬКО» (потік досвіду й бомб). Лише поза паузою. */
  stepShkodkoLoot() {
    const s = this.scene;
    const K = BALANCE.shkodkoLoot;
    const relics = s.progression.relics;
    const now = s.nowMs;
    const tick = (key, everyMs) => {
      const r = stepTicker(this.lootTicks[key], now, everyMs);
      this.lootTicks[key] = r.state;
      return r.count;
    };
    if (this.sack) {
      const p = s.player;
      this.sack.setPosition(p.x + (p.side === 'left' ? 14 : -14), p.y + 8).setFlipX(p.side !== 'left');
      for (let i = tick('sack', K.sack.everyMs); i > 0; i--) this.openSack();
    }
    if (activeForm(relics) === 'iam') {
      const xp = tick('iamXp', K.iam.xpEveryMs);
      if (xp) s.gainXp(xp * K.iam.xp);
      for (let i = tick('iamBomb', K.iam.bombEveryMs); i > 0; i--) this.throwFriendlyBombs(K.iam.bombs);
    } else {
      this.lootTicks.iamXp = null;
      this.lootTicks.iamBomb = null;
    }
  }

  /** Що випало з мішка. Немає цілей для бомб чи навички для прокачки — випадає досвід. */
  openSack() {
    const s = this.scene;
    const K = BALANCE.shkodkoLoot.sack;
    this.sack.play(animKey('sack', 'shake'));
    let kind = rollSack(Math.random);
    if (kind === 'bombs' && !this.throwFriendlyBombs(K.bombs)) kind = 'xp';
    if (kind === 'skill') {
      const card = sackSkillCard(s.progression, Math.random);
      if (card) {
        s.applyPicked(card);
        sfx('levelUp');
        s.events.emit('hud:banner', { text: 'Мішок Шкодька:\nнавичка +1', ms: 1400 });
      } else kind = 'xp';
    }
    if (kind === 'xp') {
      s.gainXp(K.xp);
      s.floatText(`+${K.xp} досвіду`, '#b4e06a');
    }
    if (kind === 'steps') {
      s.meta = { ...s.meta, steps: s.meta.steps + K.steps };
      s.runSteps += K.steps;
      saveMeta(s.storage, s.meta);
      s.floatText(`+${K.steps} Шаги`, '#f2c440');
    }
  }

  /** Свої бомби в n найближчих видимих ворогів. Повертає false, якщо цілей немає. */
  throwFriendlyBombs(n) {
    const s = this.scene;
    const targets = bombTargets(s.player, s.visibleEnemies(), n);
    if (!targets.length) return false;
    const damage = friendlyBombDamage(s.weapon.damage);
    const from = this.sack ?? s.player;
    for (const t of targets) s.friendlyBombs.add(new GiftBomb(s, from.x, from.y, t.x, t.y, { friendly: true, damage }));
    sfx('throw');
    return true;
  }

  // ---------- Картки Колі (етап 9) ----------

  /** «Личинка-помічник» плює раз на everyMs; мінікопії «Я КОЛЯ» стріляють, поки живі. */
  stepKolyaLoot() {
    const s = this.scene;
    const now = s.nowMs;
    const p = s.player;
    if (this.larva) {
      this.larva.setPosition(p.x + (p.side === 'left' ? 10 : -10), p.y - 26).setFlipX(p.side !== 'left');
      const L = BALANCE.kolyaLoot.larva;
      const r = stepTicker(this.lootTicks.larva, now, L.everyMs);
      this.lootTicks.larva = r.state;
      if (r.count && this.lootShot(this.larva, lootShotDamage(L.damage, s.weapon.damage), L.speed)) this.larva.play(animKey('larva', 'spit'));
    }
    if (!this.kolyaCopies.length) return;
    const I = BALANCE.kolyaLoot.iam;
    for (const c of this.kolyaCopies) {
      c.sprite.setPosition(p.x + c.dx * (p.side === 'left' ? 1 : -1), p.y + c.dy);
      if (now >= c.nextShotAt) {
        c.nextShotAt = now + I.copyEveryMs;
        this.lootShot(c.sprite, lootShotDamage(I.copyDamage, s.weapon.damage), BALANCE.projectileSpeed);
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
    const s = this.scene;
    if (!this.ladle) return;
    const L = BALANCE.kazanLoot.ladle;
    const now = s.nowMs;
    const a = (2 * Math.PI * now) / L.orbitMs;
    this.ladle.setPosition(s.player.x + Math.cos(a) * L.orbitPx, s.player.y + Math.sin(a) * L.orbitPx * 0.6);
    const r = stepTicker(this.ladleTick, now, L.everyMs);
    this.ladleTick = r.state;
    if (r.count) this.lootShot(this.ladle, ladleDamage(s.weapon.damage), L.speed, 'magma');
  }

  /** «Я КАЗАН»: замість втрати життя — щит invulnMs і кільце лави, що б'є ворогів у radiusPx. */
  lavaRing() {
    const s = this.scene;
    const I = BALANCE.kazanLoot.iam;
    const now = s.nowMs;
    s.health = { ...s.health, invulnerableUntil: Math.max(s.health.invulnerableUntil, now + I.invulnMs) };
    s.showShield(I.invulnMs);
    sfx('boom');
    const p = s.player;
    const ring = s.add.circle(p.x, p.y, I.radiusPx, 0xf06a1e, 0.35).setStrokeStyle(4, 0xffd25a, 0.9).setDepth(40);
    s.tweens.add({ targets: ring, alpha: 0, scale: 1.1, duration: 400, onComplete: () => ring.destroy() });
    for (const e of ringVictims(p, s.visibleEnemies())) e.takeHit(I.damage, null, now);
    s.events.emit('hud:banner', { text: 'Кришка!', ms: 900 });
  }

  /** Постріл помічника в найближчого видимого ворога. false — цілей немає. */
  lootShot(from, damage, speed, texture = 'slimeSpit') {
    const s = this.scene;
    const targets = s.visibleEnemies();
    if (!targets.length) return false;
    const t = pickNearest(from, targets);
    const proj = new Projectile(s, from.x, from.y, texture, { damage, fx: null }).setScale(0.7);
    if (texture === 'slimeSpit') proj.setTint(LARVA_SHOT_TINT); // магма черпачка — своїм кольором
    s.playerProjectiles.add(proj);
    proj.launch(t.x, t.y, speed);
    return true;
  }

  /** «Я КОЛЯ»: замість втрати життя — невразливість і мінікопії, що стріляють. */
  splitIntoCopies() {
    const s = this.scene;
    const I = BALANCE.kolyaLoot.iam;
    const now = s.nowMs;
    s.health = { ...s.health, invulnerableUntil: Math.max(s.health.invulnerableUntil, now + I.invulnMs) };
    s.showShield(I.invulnMs);
    for (const c of this.kolyaCopies) c.sprite.destroy();
    const spots = [{ dx: 44, dy: -40 }, { dx: 44, dy: 36 }, { dx: 80, dy: 0 }];
    this.kolyaCopies = spots.slice(0, I.copies).map((spot, i) => ({
      ...spot,
      sprite: s.add.sprite(s.player.x, s.player.y, 'slimeKolya').setScale(0.5).setDepth(s.player.depth + 1).play(animKey('slimeKolya', 'idle')),
      nextShotAt: now + i * (I.copyEveryMs / 2),
      until: now + I.copyMs,
    }));
    sfx('squelch');
    s.floatText('Я КОЛЯ: ділюся!', '#ffb0c8');
  }
}
