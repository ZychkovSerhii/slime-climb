import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { cardWeapon, damageCardBonus } from '../systems/Progression.js';

// Верстка карток (px базової роздільності)
const CARD = { w: 600, h: 200, gap: 30 };
const STYLE = {
  card: { fill: 0x24402a, stroke: 0x9cff57, desc: '#cfe8cf' },
  weapon: { fill: 0x40301a, stroke: 0xffb84a, desc: '#f3dcb8' },
};

const WEAPON_DESC = {
  axe: (w) => `розмах навколо: ×${w.damageMul} шкоди всім поруч,\nзокрема босу; лише ближній бій`,
  chakra: (w) => `черга з ${w.burst} пострілів, перезарядка ×${w.reloadMul}\nстрибки на ${Math.round((w.jumpSpeedMul - 1) * 100)}% швидші`,
  shotgun: (w) => `3 кулі віялом ±${w.spreadDeg}°,\nкожна ×${String(w.damageMul).replace('.', ',')} шкоди`,
};

/** Картка зброї: назва з прогресом, опис і що станеться після взяття. */
function weaponText(weaponId, arsenal) {
  const w = BALANCE.weapons[weaponId];
  const done = arsenal?.progress?.[weaponId] ?? 0;
  const next = done + 1;
  const pips = '■'.repeat(next) + '□'.repeat(w.steps - next);
  const main = arsenal?.main;
  const outcome =
    next >= w.steps ? `стане основною${main ? ` замість «${BALANCE.weapons[main].name}»` : ''}` : `${pips} ${next}/${w.steps}`;
  return { title: `${w.name}  ${done}/${w.steps}`, desc: `${WEAPON_DESC[weaponId](w)}\n${outcome}` };
}

function cardText(id, picks, arsenal) {
  const weaponId = cardWeapon(id);
  if (weaponId) return weaponText(weaponId, arsenal);
  const c = BALANCE.cards;
  switch (id) {
    case 'attackSpeed':
      return { title: 'Швидкість атаки', desc: `постріл частіше на ${Math.round((1 - c.attackSpeedFactor) * 100)}%` };
    case 'damage':
      return { title: 'Урон', desc: `+${damageCardBonus({ picks })} шкоди кожним пострілом` };
    case 'slow':
      return {
        title: 'Сповільнення',
        desc: `влучання сповільнює ворога на ${Math.round((1 - c.slowFactor) * 100)}%\nна ${c.slowBaseMs / 1000} с (повторно: +${c.slowStepMs / 1000} с)`,
      };
    default:
      return { title: id, desc: '' };
  }
}

/** Пауза + вибір однієї з карток. Після вибору: подія 'levelup:picked' (id) у сцені Game. */
export default class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUp');
  }

  create({ cards = [], picks = {}, arsenal = null } = {}) {
    // зміна розміру екрана → перебудувати екран
    const onResize = () => this.scene.restart(this.sys.settings.data);
    this.scale.once(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive();
    this.add
      .text(width / 2, height * 0.2, 'Новий рівень!', { fontFamily: 'sans-serif', fontSize: '64px', color: '#ffd84a' })
      .setOrigin(0.5);

    const total = cards.length * CARD.h + (cards.length - 1) * CARD.gap;
    let y = height / 2 - total / 2 + CARD.h / 2;
    let picked = false;
    // перші tapGuardMs тапи ігноруються: другий тап «подвійного тапу» не має вибрати картку наосліп
    const openedAt = this.game.loop.time;
    for (const id of cards) {
      const { title, desc } = cardText(id, picks, arsenal);
      const st = cardWeapon(id) ? STYLE.weapon : STYLE.card;
      const bg = this.add.rectangle(width / 2, y, CARD.w, CARD.h, st.fill).setStrokeStyle(4, st.stroke);
      this.add.text(width / 2, y - 58, title, { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
      this.add
        .text(width / 2, y + 26, desc, { fontFamily: 'sans-serif', fontSize: '26px', color: st.desc, align: 'center' })
        .setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        if (picked || this.game.loop.time - openedAt < BALANCE.tapGuardMs) return;
        picked = true;
        this.scene.stop();
        this.scene.get('Game').events.emit('levelup:picked', id);
      });
      y += CARD.h + CARD.gap;
    }
  }
}
