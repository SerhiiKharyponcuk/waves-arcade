import Phaser from "phaser";
import type { SkinVisualConfig } from "@waves/shared";

export class ParticleBurst {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!scene.textures.exists("wave-particle")) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture("wave-particle", 8, 8);
      graphics.destroy();
    }
  }

  emit(x: number, y: number, visual: SkinVisualConfig, quantity = 12) {
    const emitter = this.scene.add.particles(x, y, "wave-particle", {
      quantity,
      speed: { min: 60, max: 180 },
      lifespan: { min: 260, max: 520 },
      scale: { start: 0.9, end: 0 },
      tint: Phaser.Display.Color.HexStringToColor(visual.particleColor).color,
      blendMode: "ADD"
    });

    this.scene.time.delayedCall(620, () => emitter.destroy());
  }
}
