import * as Phaser from 'phaser';

/** Подарунок (зима): їде разом зі світом посеред коридору; дотик слизака — досвід (група pickups). */
export default class Gift extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'gift');
    scene.add.existing(this);
    this.scrollsWithWorld = true;
    // ледь гойдається, щоб око чіплялось
    scene.tweens.add({ targets: this, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
