import Phaser from "phaser";
import type { GameSkinBundle } from "../skins/skinResolver";
import { ObstacleManager } from "../obstacles/ObstacleManager";
import { ParticleBurst } from "../effects/ParticleBurst";
import { PlayerController, type PlayerRenderSettings } from "../player/PlayerController";
import type { GameThemeDto } from "@waves/shared";
import { GameAudioManager, type GameAudioSettings } from "../audio/GameAudioManager";

export interface GameStats {
  score: number;
  coins: number;
  distance: number;
  durationMs: number;
  obstacleHits: number;
  inputTransitions: number;
}

export interface WavesSceneOptions {
  skins: GameSkinBundle;
  theme: GameThemeDto;
  audio: GameAudioSettings;
  performance: PlayerRenderSettings & { particles: boolean; screenShake: boolean };
  onStats: (stats: GameStats) => void;
  onGameOver: (stats: GameStats) => void | Promise<void>;
}

export class WavesScene extends Phaser.Scene {
  private readonly options: WavesSceneOptions;
  private player?: PlayerController;
  private obstacles?: ObstacleManager;
  private particles?: ParticleBurst;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private startedAt = 0;
  private coins = 0;
  private ended = false;
  private firstInputAt = 0;
  private pointerPressed = false;
  private virtualPressed = false;
  private pausedByUi = false;
  private previousPressed = false;
  private inputTransitions = 0;
  private audio?: GameAudioManager;

  constructor(options: WavesSceneOptions) {
    super("waves-scene");
    this.options = options;
  }

  create() {
    this.cameras.main.setBackgroundColor(this.options.theme.backgroundStyle);
    this.physics.world.setBounds(0, 0, 100_000, this.scale.height);
    this.drawBackdrop();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D,SPACE") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on("keydown", this.handleKeyboardAudio);
    this.player = new PlayerController(this, this.options.skins.arrow, this.options.skins.trail, this.options.performance);
    this.obstacles = new ObstacleManager(this, {
      obstacleColor: this.options.theme.obstacleStyle,
      accentColor: this.options.theme.uiAccentColor,
      backgroundColor: this.options.theme.backgroundStyle,
      animationQuality: this.options.performance.animationQuality,
      lowPerformanceMode: this.options.performance.lowPerformanceMode
    });
    this.particles = new ParticleBurst(this, {
      enabled: this.options.performance.particles,
      intensity: this.options.performance.lowPerformanceMode ? 0.55 : this.options.performance.animationQuality === "low" ? 0.72 : this.options.performance.animationQuality === "medium" ? 0.88 : 1
    });
    this.audio = new GameAudioManager(this.options.audio);
    this.startedAt = performance.now();

    this.physics.add.collider(this.player.collider, this.obstacles.obstacleGroup, () => this.finish(1));
    this.physics.add.overlap(this.player.collider, this.obstacles.coinGroup, (_player, coin) =>
      this.collectCoin(coin as Phaser.GameObjects.GameObject)
    );
    this.cameras.main.startFollow(this.player.collider, false, 0.08, 0.12, -220, 0);
    this.cameras.main.setDeadzone(180, 90);

    this.input.on("pointerdown", () => {
      this.pointerPressed = true;
      void this.audio?.unlock();
    });
    this.input.on("pointerup", () => {
      this.pointerPressed = false;
    });
    this.input.on("pointerout", () => {
      this.pointerPressed = false;
    });

    window.addEventListener("waves:virtual-control", this.handleVirtualControl as EventListener);
    window.addEventListener("waves:pause", this.handlePause as EventListener);
  }

  update(_time: number, delta: number) {
    if (!this.player || !this.obstacles || this.ended || this.pausedByUi) {
      return;
    }

    const pressed = this.readPressedInput();
    if (!this.firstInputAt) {
      if (!pressed) {
        this.obstacles.update(this.player.x, 1);
        this.options.onStats(this.currentStats(0));
        return;
      }
      this.firstInputAt = performance.now();
      this.startedAt = this.firstInputAt;
    }

    if (pressed !== this.previousPressed) {
      this.inputTransitions += 1;
      this.previousPressed = pressed;
      void this.audio?.unlock();
      if (pressed) this.audio?.playControl();
    }

    this.player.update(delta, { pressed });
    const difficulty = Math.min(18, 1 + Math.floor(this.player.distance / 5000));
    this.obstacles.update(this.player.x, difficulty);

    if (this.player.y < 10 || this.player.y > this.scale.height - 10) {
      this.finish(1);
      return;
    }

    this.options.onStats(this.currentStats(0));
  }

  shutdown() {
    window.removeEventListener("waves:virtual-control", this.handleVirtualControl as EventListener);
    window.removeEventListener("waves:pause", this.handlePause as EventListener);
    this.input.keyboard?.off("keydown", this.handleKeyboardAudio);
    this.audio?.destroy();
  }

  private drawBackdrop() {
    const graphics = this.add.graphics();
    const backgroundColor = Phaser.Display.Color.HexStringToColor(this.options.theme.backgroundStyle).color;
    const accentColor = Phaser.Display.Color.HexStringToColor(this.options.theme.uiAccentColor).color;
    const obstacleColor = Phaser.Display.Color.HexStringToColor(this.options.theme.obstacleStyle).color;
    const stripeColors = [backgroundColor, accentColor, backgroundColor, obstacleColor];
    const sectionWidth = 1800;

    for (let x = 0; x < 100_000; x += sectionWidth) {
      const colorIndex = Math.floor(x / sectionWidth) % stripeColors.length;
      const stripeColor = stripeColors[colorIndex] ?? 0x081116;
      graphics.fillStyle(stripeColor, colorIndex % 2 ? 0.24 : 0.96);
      graphics.fillRect(x, 0, sectionWidth, this.scale.height);
    }

    graphics.lineStyle(2, accentColor, 0.42);
    for (let x = 0; x < 100_000; x += 1600) {
      graphics.lineBetween(x, 0, x, this.scale.height);
    }
    for (let y = 80; y < this.scale.height; y += 80) {
      graphics.lineBetween(0, y, 100_000, y);
    }
    graphics.setDepth(-10);
  }

  private readPressedInput() {
    const pressed = Boolean(
      this.pointerPressed ||
        this.virtualPressed ||
        this.cursors?.up.isDown ||
        this.wasd?.W?.isDown ||
        this.wasd?.A?.isDown ||
        this.wasd?.SPACE?.isDown
    );

    return pressed;
  }

  private handleVirtualControl = (event: CustomEvent<{ pressed: boolean }>) => {
    this.virtualPressed = event.detail.pressed;
    if (event.detail.pressed) void this.audio?.unlock();
  };

  private handleKeyboardAudio = () => {
    void this.audio?.unlock();
  };

  private handlePause = (event: CustomEvent<{ paused: boolean }>) => {
    this.pausedByUi = event.detail.paused;
    if (this.pausedByUi) {
      this.physics.pause();
    } else {
      this.physics.resume();
    }
    this.audio?.setPaused(this.pausedByUi);
  };

  private collectCoin(coin: Phaser.GameObjects.GameObject) {
    const object = coin as Phaser.GameObjects.Arc;
    this.coins += 1;
    this.audio?.playCoin();
    this.particles?.emit(object.x, object.y, this.options.skins.trail, 10);
    object.destroy();
  }

  private currentStats(obstacleHits: number): GameStats {
    const distance = this.player?.distance ?? 0;
    return {
      score: distance + this.coins * 125,
      coins: this.coins,
      distance,
      durationMs: Math.floor(performance.now() - this.startedAt),
      obstacleHits,
      inputTransitions: this.inputTransitions
    };
  }

  private finish(obstacleHits: number) {
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.audio?.playCrash();
    const stats = this.currentStats(obstacleHits);
    if (this.player) {
      this.particles?.emit(this.player.x, this.player.y, this.options.skins.arrow, 24);
    }
    this.physics.pause();
    if (this.options.performance.screenShake && !this.options.performance.reduceMotion) {
      this.cameras.main.shake(this.options.performance.lowPerformanceMode ? 140 : 220, this.options.performance.lowPerformanceMode ? 0.003 : 0.006);
    }
    this.options.onStats(stats);
    this.options.onGameOver(stats);
  }
}
