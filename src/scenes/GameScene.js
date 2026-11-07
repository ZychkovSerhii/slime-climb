import * as Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'slime');
  }
}
