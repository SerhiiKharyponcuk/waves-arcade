import Phaser from "phaser";
import type { SkinVisualConfig } from "@waves/shared";

export class ParticleBurst {
  private readonly scene: Phaser.Scene;
  private readonly enabled: boolean;
  private readonly intensity: number;

  constructor(scene: Phaser.Scene, options?: { enabled?: boolean; intensity?: number }) {
    this.scene = scene;
    this.enabled = options?.enabled ?? true;
    this.intensity = Math.max(0.2, Math.min(1, options?.intensity ?? 1));
    if (!scene.textures.exists("wave-particle")) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture("wave-particle", 8, 8);
      graphics.destroy();
    }
  }

  emit(x: number, y: number, visual: SkinVisualConfig, quantity = 12) {
    if (!this.enabled) {
      return;
    }

    const emitter = this.scene.add.particles(x, y, "wave-particle", {
      quantity: Math.max(2, Math.round(quantity * this.intensity)),
      speed: { min: 40, max: Math.round(180 * this.intensity) },
      lifespan: { min: 200, max: Math.round(520 * this.intensity) },
      scale: { start: 0.78 * this.intensity, end: 0 },
      tint: Phaser.Display.Color.HexStringToColor(visual.particleColor).color,
      blendMode: "ADD"
    });

    this.scene.time.delayedCall(Math.round(620 * this.intensity), () => emitter.destroy());
  }
}
