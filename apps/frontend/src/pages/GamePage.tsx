import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bomb, Coins, Gift, Infinity, Pause, Play, RotateCcw, ShieldAlert, Sparkles, TimerReset, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GoogleAdSlot } from "../components/ads/GoogleAdSlot";
import { AccountRequiredModal } from "../components/auth/AccountRequiredModal";
import { RouletteWheel } from "../components/game/RouletteWheel";
import { AppLoader } from "../components/ui/AppLoader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { StatCard } from "../components/ui/StatCard";
import type { GameStats } from "../game/engine/WavesScene";
import { resolveGameSkins } from "../game/skins/skinResolver";
import { earnRewardedAdReward } from "../services/ads/adRewardClient";
import { recordAdShown, shouldShowGuestAd } from "../services/ads/guestAdPolicy";
import { gameApi } from "../services/gameApi";
import { shopApi } from "../services/shopApi";
import { walletApi } from "../services/walletApi";
import { useAuthStore } from "../store/authStore";
import { useGuestStore } from "../store/guestStore";
import type { AdPlacement, DailyRewardDto, GameSessionEndResponseDto, RouletteConfigDto, RouletteSpinDto, ShopSkin } from "../types/api";
import { gameThemes } from "@waves/shared";
import { trackEvent } from "../services/analytics";
import type { GameAudioSettings } from "../game/audio/GameAudioManager";
import { defaultGameSettings, type GameSettings } from "../types/settings";
import { gameModeDefinitions, getGameModeDefinition, type GameModeId } from "../game/engine/gameModes";
import { warmGameRuntime } from "../game/engine/createGame";

type RunState = "idle" | "running" | "paused" | "over";

const GameCanvas = lazy(() => import("../components/game/GameCanvas").then((module) => ({ default: module.GameCanvas })));

let gameRuntimePreload: Promise<unknown> | null = null;

function preloadGameRuntime() {
  if (!gameRuntimePreload) {
    gameRuntimePreload = Promise.all([
      import("../components/game/GameCanvas"),
      warmGameRuntime()
    ]);
  }
  return gameRuntimePreload;
}

function settingsValue<K extends keyof GameSettings>(
  profileSettings: Record<string, unknown> | undefined,
  guestSettings: Record<string, unknown> | undefined,
  key: K,
  fallback: GameSettings[K]
) {
  const value = guestSettings?.[key as string] ?? profileSettings?.[key as string];
  return (value as GameSettings[K] | undefined) ?? fallback;
}

const emptyStats: GameStats = {
  score: 0,
  coins: 0,
  distance: 0,
  durationMs: 0,
  obstacleHits: 0,
  inputTransitions: 0,
  modeId: "classic"
};

const modeIconMap = {
  classic: Zap,
  endless: Infinity,
  time_attack: TimerReset,
  hardcore: ShieldAlert,
  zen: Sparkles,
  boss: Bomb
} satisfies Record<GameModeId, typeof Zap>;

const modeStorageKey = "waves_selected_mode_v1";

const gameModesLocaleFallbacks = {
  uk: {
    title: "Обери режим",
    subtitle: "Кожен забіг змінює темп арени, тиск і ритм по-своєму.",
    selected: "Обрано",
    active: "Режим",
    timeLeft: "Час",
    statusLabel: "Арена",
    focusTitle: "Чого очікувати",
    timeAttackTag: "Ривок на 60 секунд",
    tags: {
      classic: "Збалансований забіг",
      endless: "Безкінечний ріст",
      hardcore: "Без пощади",
      zen: "Низький тиск",
      boss: "Тиск хвилями"
    },
    status: {
      steadyRun: "Рівномірний тиск траси",
      adaptiveArena: "Довга адаптивна арена",
      scoreRush: "Набери максимум до кінця часу",
      finalSprint: "Фінальний спринт",
      oneMistake: "Одна помилка завершує забіг",
      calmFlow: "Спокійне вікно потоку",
      waveBuild: "Наростання хвиль",
      bossWave: "Активна босс-хвиля",
      waveRecover: "Вікно відновлення"
    },
    modes: {
      classic: {
        name: "Класичний режим",
        description: "Стандартний забіг зі збалансованими перешкодами, монетами та поступовим зростанням тиску.",
        focus: "Найкраще місце, щоб вивчити траєкторії, покращити чистоту проходження й порівнювати себе зі звичайним ритмом арени."
      },
      endless: {
        name: "Безкінечний режим",
        description: "Довший забіг із плавнішим масштабуванням, більшим простором для дихання та менше різких стрибків.",
        focus: "Режим для потоку. Арена довше залишається відкритою, повільніше ускладнюється й нагороджує стабільність, а не паніку."
      },
      time_attack: {
        name: "Атака на час",
        description: "У тебе є 60 секунд, щоб набрати якомога більше очок, поки таймер не завершить забіг.",
        focus: "Збирай кожну безпечну лінію монет і тримай високий темп. Останні 20 секунд стають помітно гострішими."
      },
      hardcore: {
        name: "Хардкорний режим",
        description: "Тісніша й жорсткіша арена з густішими патернами та майже без безпечних секторів для відновлення.",
        focus: "Лише для впевнених гравців. Чекай вузькі проходи, більше накладених загроз і майже нуль милосердя."
      },
      zen: {
        name: "Дзен-режим",
        description: "М'якший забіг із ширшими проходами, легшими патернами та поблажливішим ритмом.",
        focus: "Обирай його, коли хочеш спокійнішу сесію, простіше читання арени й менше стресу від темпу."
      },
      boss: {
        name: "Босс-режим",
        description: "Арена атакує хвилями: сплески тиску змінюються короткими вікнами відновлення перед новим натиском.",
        focus: "Зчитуй ритм хвилі. Переживи сплеск, використай відновлення для ресету й готуйся до наступного натиску."
      }
    }
  },
  ru: {
    title: "Выбери режим",
    subtitle: "Каждый забег меняет ритм арены, давление и темп по-своему.",
    selected: "Выбрано",
    active: "Режим",
    timeLeft: "Время",
    statusLabel: "Арена",
    focusTitle: "Что ожидать",
    timeAttackTag: "Рывок на 60 секунд",
    tags: {
      classic: "Сбалансированный забег",
      endless: "Бесконечный рост",
      hardcore: "Без пощады",
      zen: "Низкое давление",
      boss: "Давление волнами"
    },
    status: {
      steadyRun: "Ровное давление трассы",
      adaptiveArena: "Длинная адаптивная арена",
      scoreRush: "Набери максимум до конца таймера",
      finalSprint: "Финальный спринт",
      oneMistake: "Одна ошибка завершает забег",
      calmFlow: "Спокойное окно потока",
      waveBuild: "Нарастание волн",
      bossWave: "Активная босс-волна",
      waveRecover: "Окно восстановления"
    },
    modes: {
      classic: {
        name: "Классический режим",
        description: "Стандартный соревновательный забег со сбалансированными препятствиями, монетами и нарастающим давлением.",
        focus: "Лучшее место, чтобы изучать траектории, улучшать чистоту прохождения и сравнивать свой счёт с обычным ритмом арены."
      },
      endless: {
        name: "Бесконечный режим",
        description: "Более длинный забег с плавным ростом сложности, большим пространством и меньшим числом резких всплесков.",
        focus: "Режим для потока. Арена дольше остаётся открытой, медленнее усложняется и награждает стабильность, а не панику."
      },
      time_attack: {
        name: "Атака на время",
        description: "У тебя есть 60 секунд, чтобы набрать как можно больше очков, пока таймер не завершит забег.",
        focus: "Собирай каждую безопасную линию монет и держи высокий темп. Последние 20 секунд становятся заметно жёстче."
      },
      hardcore: {
        name: "Хардкорный режим",
        description: "Более тесная и жёсткая арена с плотными паттернами и почти без безопасных зон для восстановления.",
        focus: "Только для уверенных игроков. Жди узкие проходы, больше наложенных угроз и почти ноль пощады."
      },
      zen: {
        name: "Дзен-режим",
        description: "Более мягкий забег с широкими проходами, лёгкими паттернами и более прощающим ритмом.",
        focus: "Выбирай его, когда хочешь спокойную сессию, более простое чтение арены и меньше стресса от темпа."
      },
      boss: {
        name: "Босс-режим",
        description: "Арена атакует волнами: всплески давления сменяются короткими окнами восстановления перед следующим натиском.",
        focus: "Считывай ритм волны. Переживи всплеск, используй восстановление для ресета и готовься к следующему натиску."
      }
    }
  }
} as const;

function hasBrokenLocaleText(value: string) {
  return value.includes("??") || value.includes(String.fromCharCode(208)) || value.includes(String.fromCharCode(209));
}


function loadStoredMode(): GameModeId {
  if (typeof window === "undefined") {
    return "classic";
  }

  const raw = window.localStorage.getItem(modeStorageKey);
  if (raw && gameModeDefinitions.some((mode) => mode.id === raw)) {
    return raw as GameModeId;
  }
  return "classic";
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function GamePage() {
  const { t, i18n } = useTranslation();
  const { user, patchWallet } = useAuthStore();
  const { active: guestActive, session: guestSession, recordGame, updateSession, requestAuthentication } = useGuestStore();
  const isGuest = guestActive && !user;
  const [runState, setRunState] = useState<RunState>("idle");
  const [sessionId, setSessionId] = useState("");
  const [stats, setStats] = useState<GameStats>(emptyStats);
  const [result, setResult] = useState<GameSessionEndResponseDto | null>(null);
  const [skins, setSkins] = useState<ShopSkin[]>([]);
  const [dailyReward, setDailyReward] = useState<DailyRewardDto | null>(null);
  const [rouletteConfig, setRouletteConfig] = useState<RouletteConfigDto | null>(null);
  const [lastSpin, setLastSpin] = useState<RouletteSpinDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [spinBusy, setSpinBusy] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [error, setError] = useState("");
  const [accountRequiredMessage, setAccountRequiredMessage] = useState("");
  const [showGuestAd, setShowGuestAd] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameModeId>(() => loadStoredMode());
  const latestStatsRef = useRef<GameStats>(emptyStats);
  const checkpointSequenceRef = useRef(0);
  const checkpointPendingRef = useRef(false);

  const handleStats = useCallback((nextStats: GameStats) => {
    latestStatsRef.current = nextStats;
    setStats(nextStats);
  }, []);

  useEffect(() => {
    if (isGuest) {
      void shopApi.skins().then(setSkins).catch(() => setSkins([]));
      setDailyReward(null);
      setRouletteConfig(null);
      return;
    }
    void Promise.all([shopApi.skins(), walletApi.dailyReward(), walletApi.rouletteConfig()])
      .then(([shopSkins, reward, roulette]) => {
        setSkins(shopSkins);
        setDailyReward(reward);
        setRouletteConfig(roulette);
      })
      .catch(() => setError(t("common.error")));
  }, [isGuest, t]);

  const gameSkins = useMemo(() => resolveGameSkins(user, skins, guestSession?.selectedBasicSkin), [guestSession?.selectedBasicSkin, user, skins]);
  const selectedTheme = useMemo(() => {
    const themeId = isGuest ? guestSession?.selectedBasicTheme : user?.profile.selectedThemeId;
    return gameThemes.find((theme) => theme.id === themeId) ?? gameThemes[0]!;
  }, [guestSession?.selectedBasicTheme, isGuest, user?.profile.selectedThemeId]);
  const audioSettings = useMemo<GameAudioSettings>(() => {
    if (isGuest) {
      return {
        masterVolume: guestSession?.temporarySettings.masterVolume ?? defaultGameSettings.masterVolume,
        musicVolume: defaultGameSettings.musicVolume,
        soundEffectsVolume: defaultGameSettings.soundEffectsVolume,
        muteAll: guestSession?.temporarySettings.muted ?? false
      };
    }

    const saved = (user?.profile.gameSettings ?? {}) as Partial<GameSettings>;
    return {
      masterVolume: saved.masterVolume ?? defaultGameSettings.masterVolume,
      musicVolume: saved.musicVolume ?? defaultGameSettings.musicVolume,
      soundEffectsVolume: saved.soundEffectsVolume ?? defaultGameSettings.soundEffectsVolume,
      muteAll: saved.muteAll ?? defaultGameSettings.muteAll
    };
  }, [guestSession?.temporarySettings.masterVolume, guestSession?.temporarySettings.muted, isGuest, user?.profile.gameSettings]);

  const runtimeSettings = useMemo(
    () => ({
      trailEffects: settingsValue(user?.profile.gameSettings, guestSession?.temporarySettings as Record<string, unknown> | undefined, "trailEffects", defaultGameSettings.trailEffects),
      reduceMotion: settingsValue(user?.profile.gameSettings, guestSession?.temporarySettings as Record<string, unknown> | undefined, "reduceMotion", defaultGameSettings.reduceMotion),
      animationQuality: settingsValue(user?.profile.gameSettings, guestSession?.temporarySettings as Record<string, unknown> | undefined, "animationQuality", defaultGameSettings.animationQuality),
      lowPerformanceMode: settingsValue(user?.profile.gameSettings, guestSession?.temporarySettings as Record<string, unknown> | undefined, "lowPerformanceMode", defaultGameSettings.lowPerformanceMode),
      particles: settingsValue(user?.profile.gameSettings, guestSession?.temporarySettings as Record<string, unknown> | undefined, "particles", defaultGameSettings.particles),
      screenShake: settingsValue(user?.profile.gameSettings, guestSession?.temporarySettings as Record<string, unknown> | undefined, "screenShake", defaultGameSettings.screenShake)
    }),
    [guestSession?.temporarySettings, user?.profile.gameSettings]
  );
  const selectedModeDefinition = useMemo(() => getGameModeDefinition(selectedMode), [selectedMode]);
  const SelectedModeIcon = modeIconMap[selectedMode];
  const localeKey = (i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2) as keyof typeof gameModesLocaleFallbacks;

  const modeText = useCallback((key: string, modeId?: GameModeId) => {
    const translated = t(key);
    if (!hasBrokenLocaleText(translated)) {
      return translated;
    }

    const fallback = gameModesLocaleFallbacks[localeKey];
    if (!fallback) {
      return translated;
    }

    if (key === "gameModes.title") return fallback.title;
    if (key === "gameModes.subtitle") return fallback.subtitle;
    if (key === "gameModes.selected") return fallback.selected;
    if (key === "gameModes.active") return fallback.active;
    if (key === "gameModes.timeLeft") return fallback.timeLeft;
    if (key === "gameModes.statusLabel") return fallback.statusLabel;
    if (key === "gameModes.focusTitle") return fallback.focusTitle;
    if (key === "gameModes.timeAttackTag") return fallback.timeAttackTag;
    if (key.startsWith("gameModes.tags.")) {
      const tagId = key.replace("gameModes.tags.", "") as keyof typeof fallback.tags;
      return fallback.tags[tagId] ?? translated;
    }
    if (key.startsWith("gameModes.status.")) {
      const statusId = key.replace("gameModes.status.", "") as keyof typeof fallback.status;
      return fallback.status[statusId] ?? translated;
    }
    if (key.startsWith("gameModes.modes.") && modeId) {
      const field = key.endsWith(".name") ? "name" : key.endsWith(".description") ? "description" : key.endsWith(".focus") ? "focus" : null;
      if (!field) {
        return translated;
      }
      return fallback.modes[modeId][field] ?? translated;
    }

    return translated;
  }, [i18n.language, i18n.resolvedLanguage, localeKey, t]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
      return;
    }

    const prewarm = () => {
      void preloadGameRuntime()
        .then(() => setRuntimeReady(true))
        .catch(() => undefined);
    };

    const idleWindow = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(prewarm, { timeout: 1800 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(prewarm, 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(modeStorageKey, selectedMode);
    }
  }, [selectedMode]);

  async function startRun() {
    setBusy(true);
    setError("");
    try {
      await preloadGameRuntime();
      setRuntimeReady(true);
      if (isGuest) {
        setSessionId("");
        setStats({ ...emptyStats, modeId: selectedMode });
        setResult(null);
        setShowGuestAd(false);
        setRunState("running");
        trackEvent("game_start", { mode: "guest", gameMode: selectedMode });
        latestStatsRef.current = { ...emptyStats, modeId: selectedMode };
        checkpointSequenceRef.current = 0;
        return;
      }
      const session = await gameApi.startSession();
      setSessionId(session.sessionId);
      setStats({ ...emptyStats, modeId: selectedMode });
      setResult(null);
      setRunState("running");
      trackEvent("game_start", { mode: "account", gameMode: selectedMode });
      latestStatsRef.current = { ...emptyStats, modeId: selectedMode };
      checkpointSequenceRef.current = 0;
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const sendCheckpoint = useCallback(async () => {
    const currentStats = latestStatsRef.current;
    if (isGuest || !sessionId || checkpointPendingRef.current || currentStats.durationMs < 1_000) {
      return;
    }

    checkpointPendingRef.current = true;
    const sequence = checkpointSequenceRef.current + 1;
    try {
      await gameApi.checkpoint({
        sessionId,
        sequence,
        elapsedMs: currentStats.durationMs,
        distance: currentStats.distance,
        coinsCollected: currentStats.coins,
        inputTransitions: currentStats.inputTransitions
      });
      checkpointSequenceRef.current = sequence;
    } catch {
      // The final server validation decides whether the run is accepted.
    } finally {
      checkpointPendingRef.current = false;
    }
  }, [isGuest, sessionId]);

  useEffect(() => {
    if (runState !== "running" || isGuest || !sessionId) {
      return;
    }

    const interval = window.setInterval(() => void sendCheckpoint(), 5_000);
    return () => window.clearInterval(interval);
  }, [isGuest, runState, sendCheckpoint, sessionId]);

  async function claimReward() {
    if (isGuest) {
      setAccountRequiredMessage(t("gameExtra.accountForRewards"));
      return;
    }
    setBusy(true);
    try {
      const claimed = await walletApi.claimDailyReward();
      setDailyReward(claimed.reward);
      patchWallet(claimed.wallet);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function spinRoulette(): Promise<RouletteSpinDto | null> {
    if (isGuest) {
      setAccountRequiredMessage(t("gameExtra.accountForRewards"));
      return null;
    }
    if (!rouletteConfig) {
      return null;
    }
    setSpinBusy(true);
    try {
      const result = await walletApi.spinRoulette(rouletteConfig.nextSpinCostAds);
      patchWallet(result.wallet);
      setLastSpin(result.spin);
      setRouletteConfig((current) =>
        current
          ? {
              ...current,
              nextSpinCostAds: result.nextSpinCostAds
            }
          : current
      );
      return result.spin;
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
      return null;
    } finally {
      setSpinBusy(false);
    }
  }

  async function watchAd(placement: AdPlacement = "coins") {
    if (isGuest) {
      setAccountRequiredMessage(t("gameExtra.accountForRewardedItems"));
      return;
    }
    setAdBusy(true);
    try {
      const result = await earnRewardedAdReward(placement);
      patchWallet(result.wallet);
      setError("");
      if (placement === "roulette") {
        const roulette = await walletApi.rouletteConfig();
        setRouletteConfig(roulette);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setAdBusy(false);
    }
  }

  const handleGameOver = useCallback(
    async (finalStats: GameStats) => {
      setRunState("over");
      setStats(finalStats);
      trackEvent("game_complete", { mode: isGuest ? "guest" : "account", gameMode: selectedMode, score: finalStats.score, durationMs: finalStats.durationMs });

      if (isGuest) {
        recordGame(finalStats.score);
        const nextSession = useGuestStore.getState().session;
        if (nextSession && shouldShowGuestAd("game_over", nextSession)) {
          updateSession(recordAdShown);
          setShowGuestAd(true);
        }
        return;
      }

      if (!sessionId) {
        return;
      }

      try {
        await sendCheckpoint();
        const submitted = await gameApi.endSession({
          sessionId,
          score: finalStats.score,
          coinsCollected: finalStats.coins,
          distance: finalStats.distance,
          durationMs: finalStats.durationMs,
          obstacleHits: finalStats.obstacleHits,
          clientChecksum: ""
        });
        setResult(submitted);
        patchWallet(submitted.wallet);
      } catch {
        setError(t("common.error"));
      }
    },
    [isGuest, patchWallet, recordGame, selectedMode, sendCheckpoint, sessionId, t, updateSession]
  );

  function openGuestSavePrompt() {
    setAccountRequiredMessage(t("gameExtra.loginToSave"));
    if (guestSession && shouldShowGuestAd("save_score", guestSession)) {
      updateSession(recordAdShown);
      setShowGuestAd(true);
    }
  }

  if (runState === "running" || runState === "paused" || runState === "over") {
    return (
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-2 text-sm font-bold md:grid-cols-5">
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
              {modeText("gameModes.active")}: {modeText(`gameModes.modes.${selectedMode}.name`, selectedMode)}
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
              {stats.timeLeftMs !== undefined ? modeText("gameModes.timeLeft") : modeText("gameModes.statusLabel")}:{" "}
              {stats.timeLeftMs !== undefined ? formatCountdown(stats.timeLeftMs) : modeText(stats.modeStatusKey ?? selectedModeDefinition.statusKey, selectedMode)}
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
              {t("game.score")}: {stats.score}
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
              {t("game.coins")}: {stats.coins}
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
              {t("game.distance")}: {stats.distance}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRunState(runState === "paused" ? "running" : "paused")}
              icon={runState === "paused" ? <Play size={18} /> : <Pause size={18} />}
            >
              {runState === "paused" ? t("game.resume") : t("game.pause")}
            </Button>
            <Button type="button" variant="danger" onClick={() => setRunState("idle")} icon={<RotateCcw size={18} />}>
              {t("game.exit")}
            </Button>
          </div>
        </div>

        <Suspense fallback={<AppLoader label={t("loader.runtimeTitle")} subtitle={t("loader.runtimeSubtitle")} compact />}>
          <GameCanvas
            modeId={selectedMode}
            skins={gameSkins}
            theme={selectedTheme}
            audio={audioSettings}
            settings={runtimeSettings}
            paused={runState === "paused" || runState === "over"}
            onStats={handleStats}
            onGameOver={handleGameOver}
          />
        </Suspense>

        {runState === "over" ? (
          <Modal title={t("game.gameOver")} closeLabel={t("common.close")} onClose={() => setRunState("idle")}>
            <div className="grid gap-4">
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <SelectedModeIcon size={18} className="text-cyanGlow" />
                <div>
                  <div className="font-bold text-white">{modeText(`gameModes.modes.${selectedMode}.name`, selectedMode)}</div>
                  <div>{modeText(`gameModes.modes.${selectedMode}.description`, selectedMode)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<Zap size={20} />} label={t("game.score")} value={result?.score ?? stats.score} />
                <StatCard icon={<Coins size={20} />} label={isGuest ? t("guest.localBest") : t("game.coinsEarned")} value={isGuest ? guestSession?.bestGuestScore ?? stats.score : result?.coinsAwarded ?? 0} />
              </div>
              {result?.newHighScore ? (
                <div className="rounded-md border border-cyanGlow/40 bg-cyanGlow/10 p-3 text-sm font-bold text-cyanGlow">
                  {t("game.newBest")}
                </div>
              ) : null}
              {result?.status === "pending_review" || result?.status === "suspicious" ? (
                <div className="rounded-md border border-goldGlow/40 bg-goldGlow/10 p-3 text-sm font-bold text-goldGlow">
                  {t("gameExtra.scoreUnderReview")}
                </div>
              ) : null}
              {result?.status === "rejected" ? (
                <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm font-bold text-pink-200">
                  {t("gameExtra.scoreRejected")}
                </div>
              ) : null}
              {isGuest ? (
                <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm leading-6 text-slate-200">
                  {t("gameExtra.guestGameOver")}
                </div>
              ) : null}
              {isGuest && showGuestAd ? <GoogleAdSlot /> : null}
              {isGuest ? (
                <Button type="button" onClick={openGuestSavePrompt} icon={<Zap size={18} />}>
                  {t("gameExtra.saveScore")}
                </Button>
              ) : null}
              <Button type="button" onClick={() => void startRun()} icon={<RotateCcw size={18} />}>
                {t("game.restart")}
              </Button>
              {isGuest ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => requestAuthentication("register")}>{t("guest.createAccount")}</Button>
                  <Button type="button" variant="secondary" onClick={() => requestAuthentication("login")}>{t("auth.login")}</Button>
                </div>
              ) : null}
              {isGuest ? <Button type="button" variant="ghost" onClick={() => setRunState("idle")}>{t("guest.continue")}</Button> : null}
            </div>
          </Modal>
        ) : null}

        {accountRequiredMessage ? (
          <AccountRequiredModal
            message={accountRequiredMessage}
            onLogin={() => requestAuthentication("login")}
            onRegister={() => requestAuthentication("register")}
            onContinue={() => setAccountRequiredMessage("")}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-lg border border-white/10 bg-grid bg-[size:30px_30px] p-6 shadow-neon">
        <div className="mb-5 inline-flex rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          {t("brand")}
        </div>
        <h1 className="max-w-2xl text-4xl font-black leading-tight text-white neon-text sm:text-6xl">
          {t("menu.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">{t("menu.subtitle")}</p>
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">{modeText("gameModes.title")}</h2>
              <p className="text-sm leading-6 text-slate-300">{modeText("gameModes.subtitle")}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {gameModeDefinitions.map((mode) => {
              const selected = mode.id === selectedMode;
              const ModeIcon = modeIconMap[mode.id];
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`text-left transition duration-200 ${selected ? "scale-[1.01]" : "hover:-translate-y-0.5 hover:border-white/20"} rounded-lg border p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanGlow/70`}
                  style={{
                    borderColor: selected ? mode.accent : "rgba(255,255,255,0.1)",
                    background: selected ? `linear-gradient(180deg, ${mode.glow}, rgba(8,17,22,0.9))` : "rgba(255,255,255,0.04)",
                    boxShadow: selected ? `0 0 0 1px ${mode.accent} inset, 0 18px 48px ${mode.glow}` : "none"
                  }}
                  aria-pressed={selected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex rounded-md border border-white/10 bg-white/5 p-2">
                      <ModeIcon size={18} style={{ color: mode.accent }} />
                    </div>
                    {selected ? (
                      <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        {modeText("gameModes.selected")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 text-lg font-black text-white">{modeText(`gameModes.modes.${mode.id}.name`, mode.id)}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">{modeText(`gameModes.modes.${mode.id}.description`, mode.id)}</div>
                  <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {modeText(mode.timeLimitMs ? "gameModes.timeAttackTag" : `gameModes.tags.${mode.id}`, mode.id)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={busy}
            onMouseEnter={() => void preloadGameRuntime().then(() => setRuntimeReady(true))}
            onFocus={() => void preloadGameRuntime().then(() => setRuntimeReady(true))}
            onClick={() => void startRun()}
            icon={<Play size={18} />}
          >
            {t("menu.playNow")}
          </Button>
          <Button type="button" variant="secondary" disabled icon={<SelectedModeIcon size={18} />}>
            {modeText(`gameModes.modes.${selectedMode}.name`, selectedMode)}
          </Button>
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
          <div className="font-bold text-white">{modeText("gameModes.focusTitle")}</div>
          <div className="mt-1">{modeText(`gameModes.modes.${selectedMode}.focus`, selectedMode)}</div>
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">{t("game.tapToControl")}</div>
        </div>
        {error ? <div className="mt-5 rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}
      </div>

      <aside className="grid gap-4">
        {!runtimeReady ? (
          <div className="rounded-lg border border-cyanGlow/20 bg-cyanGlow/10 p-4 text-sm leading-6 text-slate-200">
            {t("loader.runtimeHint")}
          </div>
        ) : null}
        <div className="arcade-border rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">{t("menu.dailyReward")}</h2>
            <Gift className="text-goldGlow" size={22} />
          </div>
          <div className="grid gap-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
              <span>{t("menu.streak")}</span>
              <strong className="text-white">{dailyReward?.streak ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
              <span>{t("menu.reward", { coins: dailyReward?.rewardCoins ?? 100 })}</span>
              <Coins className="text-goldGlow" size={18} />
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={busy || (!isGuest && !dailyReward?.canClaim)}
            onClick={() => void claimReward()}
            icon={<Gift size={18} />}
          >
            {isGuest ? t("guest.accountRequired") : dailyReward?.canClaim ? t("menu.claim") : t("menu.claimed")}
          </Button>
        </div>

        <div className="grid gap-3">
          <RouletteWheel
            adBusy={adBusy}
            config={rouletteConfig}
            lastSpin={lastSpin}
            spinning={spinBusy}
            tickets={user?.wallet.rouletteTickets ?? 0}
            onSpin={spinRoulette}
            onWatchAd={() => watchAd("roulette")}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={adBusy}
            onClick={() => void watchAd("coins")}
            icon={<Coins size={18} />}
          >
            {adBusy ? t("ads.watching") : t("ads.watchForCoins")}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={<Zap size={20} />} label={t("profile.highScore")} value={user?.profile.highScore ?? 0} />
          <StatCard icon={<Coins size={20} />} label={isGuest ? t("guest.games") : t("profile.coins")} value={isGuest ? guestSession?.gamesPlayed ?? 0 : user?.wallet.coins ?? 0} />
        </div>

        <GoogleAdSlot />
      </aside>

      {accountRequiredMessage ? (
        <AccountRequiredModal
          message={accountRequiredMessage}
          onLogin={() => requestAuthentication("login")}
          onRegister={() => requestAuthentication("register")}
          onContinue={() => setAccountRequiredMessage("")}
        />
      ) : null}
    </section>
  );
}
