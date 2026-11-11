// Спільні дрібниці інтерфейсу меню-сцен (текст і кнопки). Без логіки гри.

export const textStyle = (size, color = '#ffffff') => ({ fontFamily: 'sans-serif', fontSize: `${size}px`, color, align: 'center' });

/** Текстова кнопка з підкладкою. onTap викликається на pointerdown. */
export function button(scene, x, y, label, onTap, color = '#cfe8cf', size = 36) {
  const b = scene.add
    .text(x, y, label, { ...textStyle(size, color), backgroundColor: '#00000066', padding: { x: 24, y: 12 } })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  b.on('pointerdown', onTap);
  return b;
}

/** Кнопка «Назад» знизу екрана — у меню. */
export function backButton(scene) {
  const { width, height } = scene.scale;
  return button(scene, width / 2, height * 0.92, '← Назад', () => scene.scene.start('Menu'));
}

/** Перебудувати сцену при зміні розміру екрана. */
export function rebuildOnResize(scene, Phaser) {
  const onResize = () => scene.scene.restart(scene.sys.settings.data);
  scene.scale.once(Phaser.Scale.Events.RESIZE, onResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, onResize));
}
