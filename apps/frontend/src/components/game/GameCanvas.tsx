import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import type { GameSkinBundle } from "../../game/skins/skinResolver";
import { createWavesGame } from "../../game/engine/createGame";
import type { GameStats } from "../../game/engine/WavesScene";
import { VirtualJoystick } from "./VirtualJoystick";
import type { GameThemeDto } from "@waves/shared";

interface GameCanvasProps {
  skins: GameSkinBundle;
  theme: GameThemeDto;
  paused: boolean;
  onStats: (stats: GameStats) => void;
  onGameOver: (stats: GameStats) => void | Promise<void>;
}

export function GameCanvas({ skins, theme, paused, onStats, onGameOver }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    gameRef.current = createWavesGame(containerRef.current, {
      skins,
      theme,
      onStats,
      onGameOver
    });

    return () => {
      window.dispatchEvent(new CustomEvent("waves:virtual-control", { detail: { pressed: false } }));
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onGameOver, onStats, skins, theme]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("waves:pause", { detail: { paused } }));
  }, [paused]);

  return (
    <div className="game-canvas relative h-[66vh] min-h-[28rem] overflow-hidden rounded-lg border border-white/10 bg-ink shadow-neon">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-4 left-4">
        <VirtualJoystick />
      </div>
    </div>
  );
}
