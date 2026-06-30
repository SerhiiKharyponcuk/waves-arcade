import Phaser from "phaser";
import type { SkinVisualConfig } from "@waves/shared";

export interface PlayerInputState {
  pressed: boolean;
  verticalSpeedScale?: number;
}

export interface PlayerRenderSettings {
  trailEffects: boolean;
  reduceMotion: boolean;
  animationQuality: "low" | "medium" | "high";
  lowPerformanceMode: boolean;
}

export class PlayerController {
  public readonly collider: Phaser.GameObjects.Arc;
  public x: number;
  public y: number;
  public distance = 0;

  private readonly scene: Phaser.Scene;
  private readonly arrowVisual: SkinVisualConfig;
  private readonly trailVisual: SkinVisualConfig;
  private readonly renderSettings: PlayerRenderSettings;
  private readonly trailGraphics: Phaser.GameObjects.Graphics;
  private readonly arrowGraphics: Phaser.GameObjects.Graphics;
  private readonly trailPoints: Phaser.Math.Vector2[] = [];
  private readonly trailPointLimit: number;
  private readonly speedX = 335;
  private readonly verticalSpeed = 335;
  private direction = 1;
  private currentAngle = 0.76;
  private turnPulse = 0;

  constructor(scene: Phaser.Scene, arrowVisual: SkinVisualConfig, trailVisual: SkinVisualConfig, renderSettings: PlayerRenderSettings) {
    this.scene = scene;
    this.arrowVisual = arrowVisual;
    this.trailVisual = trailVisual;
    this.renderSettings = renderSettings;
    this.trailPointLimit = renderSettings.lowPerformanceMode ? 56 : renderSettings.animationQuality === "low" ? 84 : renderSettings.animationQuality === "medium" ? 108 : 126;
    this.x = 140;
    this.y = scene.scale.height / 2;
    this.trailGraphics = scene.add.graphics();
    this.arrowGraphics = scene.add.graphics();
    this.collider = scene.add.circle(this.x, this.y, 12, 0xffffff, 0);
    scene.physics.add.existing(this.collider);
    const body = this.collider.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12);
    body.setAllowGravity(false);
  }

  update(deltaMs: number, input: PlayerInputState) {
    const dt = deltaMs / 1000;
    const nextDirection = input.pressed ? -1 : 1;
    if (nextDirection !== this.direction) {
      this.turnPulse = this.renderSettings.reduceMotion ? 0.28 : 1;
    }
    this.direction = nextDirection;
    const targetAngle = this.direction < 0 ? -0.76 : 0.76;
    const angleEase = this.renderSettings.reduceMotion ? 1 : 1 - Math.exp(-18 * dt);
    this.currentAngle = Phaser.Math.Linear(this.currentAngle, targetAngle, angleEase);
    this.turnPulse = Math.max(0, this.turnPulse - dt * (this.renderSettings.reduceMotion ? 7.2 : 4.8));

    this.x += this.speedX * dt;
    this.y += this.direction * this.verticalSpeed * (input.verticalSpeedScale ?? 1) * dt;
    this.distance = Math.max(this.distance, Math.floor(this.x - 140));

    this.collider.setPosition(this.x, this.y);
    this.pushTrailPoint();
    this.draw();
  }

  destroy() {
    this.trailGraphics.destroy();
    this.arrowGraphics.destroy();
    this.collider.destroy();
  }

  private pushTrailPoint() {
    if (!this.renderSettings.trailEffects) {
      this.trailPoints.length = 0;
      return;
    }

    this.trailPoints.push(new Phaser.Math.Vector2(this.x - 9, this.y));
    while (this.trailPoints.length > this.trailPointLimit) {
      this.trailPoints.shift();
    }
  }

  private draw() {
    const primary = Phaser.Display.Color.HexStringToColor(this.arrowVisual.primaryColor).color;
    const secondary = Phaser.Display.Color.HexStringToColor(this.arrowVisual.secondaryColor).color;
    const trailColor = Phaser.Display.Color.HexStringToColor(this.trailVisual.primaryColor).color;
    const trailSecondary = Phaser.Display.Color.HexStringToColor(this.trailVisual.secondaryColor).color;
    const trailGlow = Phaser.Display.Color.HexStringToColor(this.trailVisual.glowColor).color;
    const trailParticle = Phaser.Display.Color.HexStringToColor(this.trailVisual.particleColor).color;

    this.trailGraphics.clear();
    if (this.renderSettings.trailEffects) {
      const pointStep = this.renderSettings.lowPerformanceMode ? 4 : this.renderSettings.animationQuality === "low" ? 3 : 2;
      for (let index = 1; index < this.trailPoints.length; index += 1) {
        const previous = this.trailPoints[index - 1];
        const current = this.trailPoints[index];
        if (!previous || !current || index % pointStep !== 1) {
          continue;
        }
        const alpha = index / this.trailPoints.length;
        const segmentColor = this.resolveTrailSegmentColor(index, trailColor, trailSecondary, trailGlow, trailParticle);

        if (!this.renderSettings.lowPerformanceMode) {
          const glowWidth = this.trailVisual.trailTexture === "shadow" ? 5 + alpha * 7 : 4 + alpha * 9;
          this.trailGraphics.lineStyle(glowWidth, trailGlow, alpha * 0.12);
          this.trailGraphics.lineBetween(previous.x, previous.y, current.x, current.y);
        }

        this.trailGraphics.lineStyle(
          this.renderSettings.lowPerformanceMode ? 2 + alpha * 2 : 2 + alpha * 3,
          segmentColor,
          alpha * (this.trailVisual.trailTexture === "shadow" ? 0.62 : 0.9)
        );
        this.trailGraphics.lineBetween(previous.x, previous.y, current.x, current.y);

        if (!this.renderSettings.lowPerformanceMode && this.trailVisual.trailTexture === "diamond" && index % 9 === 1) {
          this.trailGraphics.fillStyle(trailParticle, alpha * 0.65);
          this.trailGraphics.fillCircle(current.x, current.y, 1.5 + alpha * 1.8);
        }
      }
    }

    this.arrowGraphics.clear();
    this.arrowGraphics.setRotation(0);
    const angle = this.currentAngle;
    const pulse = this.turnPulse;
    const tip = this.rotatePoint(this.x + 23 + pulse * 3, this.y, angle);
    const backA = this.rotatePoint(this.x - 18, this.y - 14 - pulse * 3, angle);
    const backB = this.rotatePoint(this.x - 18, this.y + 14 + pulse * 3, angle);
    const notch = this.rotatePoint(this.x - 7 - pulse * 2, this.y, angle);

    if (pulse > 0 && !this.renderSettings.reduceMotion) {
      const flareBack = this.rotatePoint(this.x - 34 - pulse * 12, this.y, angle);
      const flareTop = this.rotatePoint(this.x - 12, this.y - 18 - pulse * 10, angle);
      const flareBottom = this.rotatePoint(this.x - 12, this.y + 18 + pulse * 10, angle);
      if (!this.renderSettings.lowPerformanceMode) {
        this.arrowGraphics.lineStyle(2 + pulse * 4, secondary, 0.18 * pulse);
        this.arrowGraphics.strokeTriangle(flareBack.x, flareBack.y, flareTop.x, flareTop.y, flareBottom.x, flareBottom.y);
        this.arrowGraphics.lineStyle(1 + pulse * 3, primary, 0.2 * pulse);
        this.arrowGraphics.strokeCircle(this.x, this.y, 16 + pulse * 16);
      }
    }

    this.arrowGraphics.lineStyle(5 + pulse * 2, secondary, 0.38 + pulse * 0.16);
    this.arrowGraphics.strokeTriangle(tip.x, tip.y, backA.x, backA.y, notch.x, notch.y);
    this.arrowGraphics.strokeTriangle(tip.x, tip.y, backB.x, backB.y, notch.x, notch.y);
    this.arrowGraphics.fillStyle(primary, 1);
    this.arrowGraphics.fillTriangle(tip.x, tip.y, backA.x, backA.y, notch.x, notch.y);
    this.arrowGraphics.fillStyle(secondary, 1);
    this.arrowGraphics.fillTriangle(tip.x, tip.y, backB.x, backB.y, notch.x, notch.y);
  }

  private rotatePoint(x: number, y: number, angle: number) {
    const dx = x - this.x;
    const dy = y - this.y;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: this.x + dx * cos - dy * sin,
      y: this.y + dx * sin + dy * cos
    };
  }

  private resolveTrailSegmentColor(
    index: number,
    primary: number,
    secondary: number,
    glow: number,
    particle: number
  ) {
    if (this.trailVisual.trailTexture === "rainbow") {
      const rainbow = [0xfb7185, 0xfacc15, 0x22c55e, 0x38bdf8, 0xa78bfa];
      return rainbow[Math.floor(index / 5) % rainbow.length] ?? primary;
    }

    if (this.trailVisual.trailTexture === "fire") {
      return index % 4 === 1 ? glow : index % 4 === 3 ? particle : primary;
    }

    if (this.trailVisual.trailTexture === "ice") {
      return index % 3 === 0 ? particle : index % 3 === 1 ? glow : primary;
    }

    if (this.trailVisual.trailTexture === "galaxy") {
      return index % 5 === 0 ? particle : index % 2 === 0 ? secondary : primary;
    }

    if (this.trailVisual.trailTexture === "diamond") {
      return index % 3 === 0 ? particle : glow;
    }

    if (this.trailVisual.trailTexture === "shadow") {
      return index % 4 === 0 ? secondary : primary;
    }

    return index % 6 === 0 ? secondary : primary;
  }
}
