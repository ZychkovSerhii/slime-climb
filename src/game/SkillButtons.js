import { BALANCE } from '../config/balance.js';
import { activateInvis, invisCharge, invisStats, isInvisible } from '../systems/Skills.js';
import { KEEP_SLOTS, canSwitch, slotCard, slotShort, switchSlot } from '../systems/Arsenal.js';
import { inInvisButton, inSwitchButton } from '../systems/Layout.js';
import { sfx } from '../systems/Audio.js';

/**
 * Кнопки скілів на екрані (scene.buttons): невидимість і (етап 14) перемикання слотів зброї.
 * Кнопки малює й ловить HUD (події 'skill:invis' і 'weapon:switch' у сцені Game); тут — стан для HUD,
 * дія кнопки і blocksTap (тап по кнопці — не стрибок). Поле scene.invis лишилось у сцені: його читають
 * удари по гравцю, прозорість слизака й щит.
 * Від сцени бере: progression, invis, nowMs, paused, dead, scale, combat, events, emitHud.
 */
export default class SkillButtons {
  constructor(scene) {
    this.scene = scene;
  }

  /** Підписатись на кнопки HUD; відписка — коли сцена зупиняється. */
  bind(shutdownEvent) {
    const scene = this.scene;
    const onInvis = () => this.useInvisibility();
    const onSwitch = () => this.switchWeapon();
    scene.events.on('skill:invis', onInvis);
    scene.events.on('weapon:switch', onSwitch);
    scene.events.once(shutdownEvent, () => {
      scene.events.off('skill:invis', onInvis);
      scene.events.off('weapon:switch', onSwitch);
    });
  }

  invisStats() {
    return invisStats(this.scene.progression.picks.invisibility ?? 0);
  }

  /** Стан кнопки невидимості для HUD або null, якщо скіла немає. */
  invisHud() {
    const st = this.invisStats();
    if (!st) return null;
    const { invis, nowMs } = this.scene;
    return { active: isInvisible(invis, nowMs), charge: invisCharge(invis, st, nowMs) };
  }

  /** Кнопка невидимості. */
  useInvisibility() {
    const scene = this.scene;
    if (scene.paused || scene.dead) return;
    const before = scene.invis;
    scene.invis = activateInvis(scene.invis, this.invisStats(), scene.nowMs);
    if (scene.invis !== before) sfx('weaponReady');
    scene.emitHud();
  }

  /** Стан кнопки зброї для HUD: { active, other } — короткі назви, або null, поки другий слот порожній. */
  switchHud() {
    const a = this.scene.progression.arsenal;
    if (!canSwitch(a)) return null;
    return { active: slotShort(a.slots[a.active]), other: slotShort(a.slots[1 - a.active]) };
  }

  /** Кнопка зброї: інший слот у руки (рівні прокачки обох слотів зберігаються). */
  switchWeapon() {
    const scene = this.scene;
    if (scene.paused || scene.dead) return;
    const a = scene.progression.arsenal;
    if (!canSwitch(a)) return;
    scene.progression = { ...scene.progression, arsenal: switchSlot(a) };
    scene.combat.onSwitch(scene.progression.arsenal.main, BALANCE.slots.switchDelayMs);
    scene.emitHud();
  }

  /** Тап по кнопці — не стрибок. */
  blocksTap(x, y) {
    const { width, height } = this.scene.scale;
    if (this.invisStats() && inInvisButton(x, y, width, height)) return true;
    return Boolean(this.switchHud()) && inSwitchButton(x, y, width, height);
  }

  /** Вікно «Куди поставити?», якщо вкачана зброя чекає слота; інакше null. */
  slotWindow() {
    const { arsenal, picks } = this.scene.progression;
    if (!arsenal.pending) return null;
    // назва зброї — у картках: два рядки заголовка налазили б на першу картку
    return { cards: [slotCard(0), slotCard(1), slotCard(KEEP_SLOTS)], picks, arsenal, title: 'Куди поставити?' };
  }
}
