import * as Phaser from 'phaser';
import { BALANCE } from '../config/balance.js';
import { cardText } from '../systems/CardText.js';
import { cardUpgrade, cardWeapon } from '../systems/Progression.js';
import { cardLoot } from '../systems/Skills.js';

// Верстка карток (px базової роздільності)
const CARD = { w: 600, h: 200, gap: 30 };
const STYLE = {
  card: { fill: 0x24402a, stroke: 0x9cff57, desc: '#cfe8cf' },
  weapon: { fill: 0x40301a, stroke: 0xffb84a, desc: '#f3dcb8' },
  loot: { fill: 0x1c1424, stroke: 0xd04a6a, desc: '#e8c8d4' },
};

/** Пауза + вибір однієї з карток. Після вибору: подія 'levelup:picked' (id) у сцені Game. */
export default class LevelUpScene extends Phaser.Scene {
  constructor() {
    super('LevelUp');
  }

  create({ cards = [], picks = {}, arsenal = null, title = 'Новий рівень!' } = {}) {
    // зміна розміру екрана → перебудувати екран
    const onResize = () => this.scene.restart(this.sys.settings.data);
    this.scale.once(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive();
    this.add
      .text(width / 2, height * 0.2, title, { fontFamily: 'sans-serif', fontSize: '64px', color: '#ffd84a' })
      .setOrigin(0.5);

    const total = cards.length * CARD.h + (cards.length - 1) * CARD.gap;
    let y = height / 2 - total / 2 + CARD.h / 2;
    let picked = false;
    // перші tapGuardMs тапи ігноруються: другий тап «подвійного тапу» не має вибрати картку наосліп
    const openedAt = this.game.loop.time;
    for (const id of cards) {
      const { title, desc } = cardText(id, picks, arsenal);
      const st = cardLoot(id) ? STYLE.loot : cardWeapon(id) || cardUpgrade(id) ? STYLE.weapon : STYLE.card;
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
