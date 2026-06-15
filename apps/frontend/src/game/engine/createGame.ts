import Phaser from "phaser";
import { WavesScene, type WavesSceneOptions } from "./WavesScene";

export function createWavesGame(parent: HTMLElement, options: WavesSceneOptions) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#070914",
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
