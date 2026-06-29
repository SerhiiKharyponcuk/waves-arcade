import Phaser from "phaser";

const sectorColors = [0x8bd600, 0x2dd4be, 0x42a5f5, 0xd6336c, 0xf59f1f];
interface ObstacleTheme {
  obstacleColor: string;
  accentColor: string;
  backgroundColor: string;
  animationQuality?: "low" | "medium" | "high";
  lowPerformanceMode?: boolean;
}

type CleanupObject = Phaser.GameObjects.GameObject & { x?: number; width?: number; destroy: () => void };

export class ObstacleManager {
  public readonly obstacleGroup: Phaser.Physics.Arcade.StaticGroup;
  public readonly coinGroup: Phaser.Physics.Arcade.Group;

  private readonly scene: Phaser.Scene;
  private readonly rotatingHazards: Phaser.GameObjects.Star[] = [];
  private readonly visuals: CleanupObject[] = [];
  private nextSpawnX = 0;
  private topY = 86;
  private bottomY = 486;
  private sectorIndex = 0;
  private readonly wallColor: number;
  private readonly outlineColor: number;
  private readonly themedSectorColors: number[];
  private readonly rotationStep: number;

  constructor(scene: Phaser.Scene, theme: ObstacleTheme) {
    this.scene = scene;
    this.wallColor = Phaser.Display.Color.HexStringToColor(theme.backgroundColor).color;
    this.outlineColor = Phaser.Display.Color.HexStringToColor(theme.obstacleColor).color;
    this.themedSectorColors = [
      Phaser.Display.Color.HexStringToColor(theme.accentColor).color,
      Phaser.Display.Color.HexStringToColor(theme.obstacleColor).color,
      ...sectorColors.slice(0, 3)
    ];
    this.rotationStep = theme.lowPerformanceMode ? 0.02 : theme.animationQuality === "low" ? 0.028 : theme.animationQuality === "medium" ? 0.04 : 0.052;
    this.obstacleGroup = scene.physics.add.staticGroup();
    this.coinGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.bottomY = scene.scale.height - 86;
  }

  update(targetX: number, difficulty: number) {
    while (this.nextSpawnX < targetX + 1300) {
      this.spawnCorridorSector(this.nextSpawnX, difficulty);
    }

    for (const hazard of this.rotatingHazards) {
      hazard.rotation += this.rotationStep;
    }

    this.cleanupBehindCamera();
  }

  private spawnCorridorSector(x: number, difficulty: number) {
    const width = Phaser.Math.Between(260, 430);
    const color = this.themedSectorColors[this.sectorIndex % this.themedSectorColors.length] ?? 0x8bd600;
    this.sectorIndex += 1;

    const previousTop = this.topY;
    const previousBottom = this.bottomY;
    const gap = Math.max(172, 390 - difficulty * 7);
    const drift = Phaser.Math.Between(-84, 84);
    const center = Phaser.Math.Clamp((previousTop + previousBottom) / 2 + drift, 165, this.scene.scale.height - 165);
    this.topY = Phaser.Math.Clamp(center - gap / 2, 42, this.scene.scale.height - 240);
    this.bottomY = Phaser.Math.Clamp(center + gap / 2, this.topY + 165, this.scene.scale.height - 42);

    this.addSectorFill(x, width, color);
    this.addWallBlock(x, 0, width, this.topY);
    this.addWallBlock(x, this.bottomY, width, this.scene.scale.height - this.bottomY);
    this.addConnector(x, previousTop, this.topY, true);
    this.addConnector(x, previousBottom, this.bottomY, false);

    if (x > 760) {
      this.addEventPattern(x, width, difficulty);
    }
    this.nextSpawnX += width;
  }

  private addEventPattern(x: number, width: number, difficulty: number) {
    const roll = Phaser.Math.Between(0, 100);
    const midY = (this.topY + this.bottomY) / 2;

    if (roll < 22) {
      this.addSpikeRow(x + 58, this.bottomY - 12, Math.min(6, 2 + Math.floor(difficulty / 3)), "floor");
    } else if (roll < 42) {
      this.addSpikeRow(x + 58, this.topY + 12, Math.min(7, 3 + Math.floor(difficulty / 3)), "ceiling");
    } else if (roll < 62) {
      this.addSaw(x + width * 0.52, midY + Phaser.Math.Between(-70, 70), 28 + Math.min(14, difficulty));
      if (difficulty > 4) {
        this.addSaw(x + width * 0.78, midY + Phaser.Math.Between(-80, 80), 22);
      }
    } else if (roll < 78) {
      this.addPillar(x + width * 0.55, this.bottomY, Phaser.Math.Between(70, 126), "floor");
      if (difficulty > 5) {
        this.addPillar(x + width * 0.78, this.topY, Phaser.Math.Between(60, 112), "ceiling");
      }
    } else {
      this.addFloatingBlock(x + width * 0.5, midY + Phaser.Math.Between(-70, 70));
    }

    if (Phaser.Math.Between(0, 100) < 58) {
      this.addDiamond(x + width * 0.72, Phaser.Math.Clamp(midY + Phaser.Math.Between(-105, 105), this.topY + 54, this.bottomY - 54));
    }
  }

  private addSectorFill(x: number, width: number, color: number) {
    const fill = this.scene.add.rectangle(
      x + width / 2,
      (this.topY + this.bottomY) / 2,
      width + 2,
      this.bottomY - this.topY,
      color,
      0.92
    );
    fill.setDepth(-8);
    this.visuals.push(fill);

    const topLine = this.scene.add.rectangle(x + width / 2, this.topY, width, 3, this.outlineColor, 0.95);
    const bottomLine = this.scene.add.rectangle(x + width / 2, this.bottomY, width, 3, this.outlineColor, 0.95);
    topLine.setDepth(4);
    bottomLine.setDepth(4);
    this.visuals.push(topLine, bottomLine);
  }

  private addWallBlock(x: number, y: number, width: number, height: number) {
    if (height <= 4) {
      return;
    }

    const block = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, this.wallColor, 0.96);
    block.setStrokeStyle(4, this.outlineColor, 1);
    block.setDepth(2);
    this.scene.physics.add.existing(block, true);
    const body = block.body as Phaser.Physics.Arcade.StaticBody;
    body.updateFromGameObject();
    this.obstacleGroup.add(block);
    this.visuals.push(block);
  }

  private addConnector(x: number, fromY: number, toY: number, isTop: boolean) {
    const delta = Math.abs(toY - fromY);
    if (delta < 8) {
      return;
    }

    const y = Math.min(fromY, toY);
    const height = Math.max(24, delta);
    const connector = this.scene.add.rectangle(x + 8, y + height / 2, 18, height, this.wallColor, 0.96);
    connector.setStrokeStyle(4, this.outlineColor, 1);
    connector.setDepth(5);
    this.scene.physics.add.existing(connector, true);
    (connector.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.obstacleGroup.add(connector);
    this.visuals.push(connector);

    if (delta > 46 && Phaser.Math.Between(0, 100) < 50) {
      this.addSpikeRow(x + 22, isTop ? Math.max(fromY, toY) + 12 : Math.min(fromY, toY) - 12, 2, isTop ? "ceiling" : "floor");
    }
  }

  private addSpikeRow(x: number, y: number, count: number, side: "floor" | "ceiling") {
    for (let index = 0; index < count; index += 1) {
      this.addSpike(x + index * 25, y, side);
    }
  }

  private addSpike(x: number, y: number, side: "floor" | "ceiling") {
    const points =
      side === "floor"
        ? [0, 20, 12, -8, 24, 20]
        : [0, -20, 12, 8, 24, -20];
    const spike = this.scene.add.triangle(x, y, ...points, 0xffffff, 0.96);
    spike.setStrokeStyle(3, 0x0b1020, 0.75);
    spike.setDepth(8);
    this.visuals.push(spike);

    const hitbox = this.scene.add.rectangle(x + 12, y + (side === "floor" ? 5 : -5), 20, 22, 0xffffff, 0);
    this.scene.physics.add.existing(hitbox, true);
    (hitbox.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.obstacleGroup.add(hitbox);
    this.visuals.push(hitbox);
  }

  private addPillar(x: number, edgeY: number, height: number, side: "floor" | "ceiling") {
    const y = side === "floor" ? edgeY - height / 2 : edgeY + height / 2;
    const pillar = this.scene.add.rectangle(x, y, 40, height, this.wallColor, 0.96);
    pillar.setStrokeStyle(3, this.outlineColor, 0.82);
    pillar.setDepth(6);
    this.scene.physics.add.existing(pillar, true);
    (pillar.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.obstacleGroup.add(pillar);
    this.visuals.push(pillar);
    this.addSpike(x - 12, side === "floor" ? edgeY - height - 8 : edgeY + height + 8, side);
  }

  private addFloatingBlock(x: number, y: number) {
    const block = this.scene.add.rectangle(x, y, 58, 58, this.wallColor, 0.94);
    block.setStrokeStyle(4, this.outlineColor, 0.9);
    block.setDepth(7);
    this.scene.physics.add.existing(block, true);
    (block.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.obstacleGroup.add(block);
    this.visuals.push(block);
  }

  private addSaw(x: number, y: number, radius: number) {
    const saw = this.scene.add.star(x, y, 16, radius * 0.62, radius, 0xffffff, 0.98);
    saw.setStrokeStyle(4, 0x0b1020, 0.7);
    saw.setDepth(9);
    this.visuals.push(saw);
    this.rotatingHazards.push(saw);

    const core = this.scene.add.circle(x, y, radius * 0.46, 0x9ade15, 1);
    core.setStrokeStyle(3, 0xffffff, 0.72);
    core.setDepth(10);
    this.visuals.push(core);

    const hitbox = this.scene.add.circle(x, y, radius * 0.82, 0xffffff, 0);
    this.scene.physics.add.existing(hitbox, true);
    const body = hitbox.body as Phaser.Physics.Arcade.StaticBody;
    body.setCircle(radius * 0.82);
    body.updateFromGameObject();
    this.obstacleGroup.add(hitbox);
    this.visuals.push(hitbox);
  }

  private addDiamond(x: number, y: number) {
    const diamond = this.scene.add.rectangle(x, y, 20, 20, 0x45e7ff, 0.92);
    diamond.setRotation(Math.PI / 4);
    diamond.setStrokeStyle(3, this.outlineColor, 0.8);
    diamond.setDepth(8);
    this.scene.physics.add.existing(diamond);
    const body = diamond.body as Phaser.Physics.Arcade.Body;
    body.setCircle(14, -4, -4);
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.coinGroup.add(diamond);
  }

  private cleanupBehindCamera() {
    const leftBound = this.scene.cameras.main.scrollX - 360;

    for (const child of this.obstacleGroup.getChildren()) {
      const object = child as CleanupObject;
      if ((object.x ?? 0) + (object.width ?? 0) < leftBound) {
        object.destroy();
      }
    }

    for (const child of this.coinGroup.getChildren()) {
      const object = child as CleanupObject;
      if ((object.x ?? 0) < leftBound) {
        object.destroy();
      }
    }

    for (let index = this.visuals.length - 1; index >= 0; index -= 1) {
      const object = this.visuals[index];
      if (!object || !object.active) {
        this.visuals.splice(index, 1);
        continue;
      }
      if ((object.x ?? 0) + (object.width ?? 0) < leftBound) {
        object.destroy();
        this.visuals.splice(index, 1);
      }
    }
  }
}
