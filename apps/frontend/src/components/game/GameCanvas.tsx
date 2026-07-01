import { useCallback, useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2 } from "lucide-react";
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
  const shellRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [booting, setBooting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    if (document.fullscreenElement === shell) {
      void document.exitFullscreen();
      return;
    }

    void shell.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
  }, []);

  return (
    <div ref={shellRef} className={`game-canvas relative overflow-hidden border border-white/10 bg-ink shadow-neon ${isFullscreen ? "is-fullscreen border-0" : "rounded-lg"}`}>
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-md border border-white/15 bg-black/35 text-white shadow-neon backdrop-blur-md transition hover:border-cyanGlow/50 hover:text-cyanGlow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanGlow"
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
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
