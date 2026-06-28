import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, Gift, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GoogleAdSlot } from "../components/ads/GoogleAdSlot";
import { AccountRequiredModal } from "../components/auth/AccountRequiredModal";
import { GameCanvas } from "../components/game/GameCanvas";
import { RouletteWheel } from "../components/game/RouletteWheel";
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

type RunState = "idle" | "running" | "paused" | "over";

const emptyStats: GameStats = {
  score: 0,
  coins: 0,
  distance: 0,
  durationMs: 0,
  obstacleHits: 0,
  inputTransitions: 0
};

export function GamePage() {
  const { t } = useTranslation();
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

  async function startRun() {
    setBusy(true);
    setError("");
    try {
      if (isGuest) {
        setSessionId("");
        setStats(emptyStats);
        setResult(null);
        setShowGuestAd(false);
        setRunState("running");
        trackEvent("game_start", { mode: "guest" });
        latestStatsRef.current = emptyStats;
        checkpointSequenceRef.current = 0;
        return;
      }
      const session = await gameApi.startSession();
      setSessionId(session.sessionId);
      setStats(emptyStats);
      setResult(null);
      setRunState("running");
      trackEvent("game_start", { mode: "account" });
      latestStatsRef.current = emptyStats;
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
      trackEvent("game_complete", { mode: isGuest ? "guest" : "account", score: finalStats.score, durationMs: finalStats.durationMs });

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
    [isGuest, patchWallet, recordGame, sendCheckpoint, sessionId, t, updateSession]
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
          <div className="grid grid-cols-3 gap-2 text-sm font-bold">
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

        <GameCanvas
          skins={gameSkins}
          theme={selectedTheme}
          audio={audioSettings}
          paused={runState === "paused" || runState === "over"}
          onStats={handleStats}
          onGameOver={handleGameOver}
        />

        {runState === "over" ? (
          <Modal title={t("game.gameOver")} closeLabel={t("common.close")} onClose={() => setRunState("idle")}>
            <div className="grid gap-4">
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
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" disabled={busy} onClick={() => void startRun()} icon={<Play size={18} />}>
            {t("menu.playNow")}
          </Button>
          <Button type="button" variant="secondary" disabled>
            {t("game.tapToControl")}
          </Button>
        </div>
        {error ? <div className="mt-5 rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}
      </div>

      <aside className="grid gap-4">
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
