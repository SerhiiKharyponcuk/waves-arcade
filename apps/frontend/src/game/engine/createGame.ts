import type Phaser from "phaser";
import type { WavesSceneOptions } from "./WavesScene";

async function importGameRuntime() {
  const [phaserModule, sceneModule] = await Promise.all([import("phaser"), import("./WavesScene")]);
  return {
    Phaser: phaserModule.default,
    WavesScene: sceneModule.WavesScene
  };
}

type GameRuntime = Awaited<ReturnType<typeof importGameRuntime>>;

let runtimePromise: Promise<GameRuntime> | null = null;

async function loadGameRuntime() {
  if (!runtimePromise) {
    runtimePromise = importGameRuntime();
  }

  return runtimePromise;
}

export function warmGameRuntime() {
  return loadGameRuntime().then(() => undefined);
}

export async function createWavesGame(parent: HTMLElement, options: WavesSceneOptions): Promise<Phaser.Game> {
  const { Phaser, WavesScene } = await loadGameRuntime();

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: options.theme.backgroundStyle,
    antialias: !options.performance.lowPerformanceMode,
    pixelArt: options.performance.animationQuality === "low",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth,
      height: parent.clientHeight
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scene: [new WavesScene(options)]
  });
}
