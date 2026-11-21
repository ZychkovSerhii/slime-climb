import * as Phaser from 'phaser';

/**
 * Гнила плоть (біом 5): падає з малого мерця, лежить на стіні side і їде разом зі світом, як сердечко.
 * Дотик з неповними життями — тимчасове серце або +1 життя (SpawnDirector.useFlesh); з повними — лежить далі.
 */
export default class FleshPickup extends Phaser.Physics.Arcade.Image {
  constructor(scene, side, y) {
    super(scene, scene.player.wallX(side), y, 'flesh');
    scene.add.existing(this);
    this.kind = 'flesh';
    this.side = side;
    this.scrollsWithWorld = true;
    this.setScale(1.5);
    scene.tweens.add({ targets: this, angle: { from: -8, to: 8 }, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
