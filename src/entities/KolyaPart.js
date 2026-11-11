import KolyaBody from './KolyaBody.js';

/**
 * Уламок Колі після поділу (§9.2, 40%): менший (split.scale), повзе на split.speedMul швидше, робить ривки й плює.
 * Тип 'kolyaPart' — без досвіду, очок і Шагів (нагорода — за самого Колю). Смерть повідомляє боса (onPartGone).
 */
export default class KolyaPart extends KolyaBody {
  constructor(scene, boss, x, y, hp, offset) {
    super(scene, x, y, 'kolyaPart', boss.partScale, offset);
    this.boss = boss;
    this.hp = hp;
    this.setBaseTint(boss.baseTint);
  }

  get modeName() {
    return 'part';
  }

  get lungeOwner() {
    return this.boss;
  }

  takeHit(damage, fx, nowMs) {
    super.takeHit(damage, fx, nowMs);
    if (this.boss.active) this.boss.emitHud();
  }

  destroy(fromScene) {
    const boss = this.boss;
    const at = { x: this.x, y: this.y };
    super.destroy(fromScene);
    if (!fromScene && boss?.active) boss.onPartGone(this, at);
  }
}
