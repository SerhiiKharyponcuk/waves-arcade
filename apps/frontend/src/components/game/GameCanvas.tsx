import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { useTranslation } from "react-i18next";
import type { GameSkinBundle } from "../../game/skins/skinResolver";
import { createWavesGame } from "../../game/engine/createGame";
import type { GameStats } from "../../game/engine/WavesScene";
import { VirtualJoystick } from "./VirtualJoystick";
import type { GameThemeDto } from "@waves/shared";
import type { GameAudioSettings } from "../../game/audio/GameAudioManager";
import type { GameSettings } from "../../types/settings";
import type { GameModeId } from "../../game/engine/gameModes";
import { AppLoader } from "../ui/AppLoader";

interface GameCanvasProps {
  modeId: GameModeId;
  skins: GameSkinBundle;
  theme: GameThemeDto;
  audio: GameAudioSettings;
  settings: Pick<GameSettings, "trailEffects" | "reduceMotion" | "animationQuality" | "lowPerformanceMode" | "particles" | "screenShake">;
  paused: boolean;
  onStats: (stats: GameStats) => void;
  onGameOver: (stats: GameStats) => void | Promise<void>;
}

export function GameCanvas({ modeId, skins, theme, audio, settings, paused, onStats, onGameOver }: GameCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let cancelled = false;
    setBooting(true);

    void createWavesGame(containerRef.current, {
      modeId,
      skins,
      theme,
      audio,
      performance: {
        trailEffects: settings.trailEffects,
        reduceMotion: settings.reduceMotion,
        animationQuality: settings.animationQuality,
        lowPerformanceMode: settings.lowPerformanceMode,
        particles: settings.particles,
        screenShake: settings.screenShake
      },
      onStats,
      onGameOver
    }).then((game) => {
      if (cancelled) {
        game.destroy(true);
        return;
      }
      gameRef.current = game;
      setBooting(false);
    }).catch(() => {
      setBooting(false);
    });

    return () => {
      cancelled = true;
      window.dispatchEvent(new CustomEvent("waves:virtual-control", { detail: { pressed: false } }));
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [audio, modeId, onGameOver, onStats, settings.animationQuality, settings.lowPerformanceMode, settings.particles, settings.reduceMotion, settings.screenShake, settings.trailEffects, skins, theme]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("waves:pause", { detail: { paused } }));
  }, [paused]);

  return (
    <div className="game-canvas relative h-[calc(100dvh-12rem)] min-h-[24rem] overflow-hidden rounded-lg border border-white/10 bg-ink shadow-neon sm:h-[66vh] sm:min-h-[28rem]">
      <div ref={containerRef} className="h-full w-full" />
      {booting ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-ink/70 backdrop-blur-sm">
          <AppLoader label={t("loader.runtimeTitle")} subtitle={t("loader.runtimeSubtitle")} compact />
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-4 left-4">
        <VirtualJoystick />
      </div>
    </div>
  );
}
