import { useEffect, useState } from "react";
import { Coins, Gem, Medal, Star, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard } from "../components/ui/StatCard";
import { gameApi } from "../services/gameApi";
import { useAuthStore } from "../store/authStore";
import type { LeaderboardResponse, ProgressionDto } from "../types/api";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [progression, setProgression] = useState<ProgressionDto | null>(null);

  useEffect(() => {
    void gameApi.leaderboard().then(setLeaderboard).catch(() => setLeaderboard(null));
    void import("../services/authApi").then(({ authApi }) => authApi.progression()).then(setProgression).catch(() => setProgression(null));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          <Trophy size={17} />
          {t("nav.profile")}
        </div>
        <h1 className="text-4xl font-black text-white neon-text">{t("profile.title")}</h1>
        <p className="mt-2 text-slate-300">{user?.profile.displayName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Trophy size={20} />} label={t("profile.highScore")} value={user?.profile.highScore ?? 0} />
        <StatCard icon={<Coins size={20} />} label={t("profile.coins")} value={user?.wallet.coins ?? 0} />
        <StatCard icon={<Gem size={20} />} label={t("profile.gems")} value={user?.wallet.gems ?? 0} />
        <StatCard icon={<Medal size={20} />} label={t("profile.score")} value={leaderboard?.myBest?.highScore ?? user?.profile.highScore ?? 0} />
      </div>

      <div className="arcade-border overflow-hidden rounded-lg">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-xl font-black text-white">{t("profile.leaderboard")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="p-4">{t("profile.rank")}</th>
                <th className="p-4">{t("profile.player")}</th>
                <th className="p-4">{t("profile.score")}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard?.global.length ? (
                leaderboard.global.map((entry) => (
                  <tr key={`${entry.userId}-${entry.achievedAt}`} className="border-b border-white/5">
                    <td className="p-4 font-black text-cyanGlow">#{entry.rank}</td>
                    <td className="p-4 text-white">{entry.displayName}</td>
                    <td className="p-4 font-bold text-white">{entry.score}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={3}>
                    {t("profile.emptyLeaderboard")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="arcade-border rounded-lg p-5">
        <h2 className="flex items-center gap-2 text-xl font-black text-white"><Star size={20} className="text-goldGlow" /> {t("progression.achievements")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(progression?.achievements ?? []).map((achievement) => <div key={achievement.id} className={`rounded-md border p-4 ${achievement.unlocked ? "border-goldGlow/40 bg-goldGlow/10" : "border-white/10 bg-white/5 opacity-60"}`}><div className="font-black text-white">{t(`progression.items.${achievement.id}.title`, achievement.title)}</div><div className="mt-1 text-xs text-slate-400">{t(`progression.items.${achievement.id}.description`, achievement.description)}</div><div className="mt-3 text-xs font-black text-goldGlow">{achievement.progress}/{achievement.target}</div></div>)}
        </div>
      </div>

      {progression ? <div className="grid gap-4 lg:grid-cols-2"><section className="arcade-border rounded-lg p-5"><h2 className="text-xl font-black text-white">{t("progression.dailyMissions")}</h2><div className="mt-4 grid gap-3">{progression.dailyMissions.map((mission) => <div key={mission.id} className="rounded-md border border-white/10 bg-white/5 p-3"><div className="flex justify-between gap-3"><strong className="text-white">{t(`progression.items.${mission.id}.title`, mission.title)}</strong><span className="text-goldGlow">+{mission.rewardCoins}</span></div><div className="mt-2 text-xs text-slate-400">{mission.progress}/{mission.target}{mission.completed ? ` - ${t("progression.completed")}` : ""}</div></div>)}</div></section><section className="arcade-border rounded-lg p-5"><h2 className="text-xl font-black text-white">{t("progression.season", { name: t(`progression.seasons.${progression.season.seasonId}`, progression.season.name) })}</h2><div className="mt-4 text-3xl font-black text-cyanGlow">{t("progression.level", { level: progression.season.level })}</div><div className="mt-2 text-sm text-slate-300">{progression.season.xp}/{progression.season.xpForNextLevel} {t("progression.xp")}</div><div className="mt-3 h-2 overflow-hidden rounded bg-white/10"><div className="h-full bg-cyanGlow" style={{ width: `${Math.min(100, progression.season.xp / progression.season.xpForNextLevel * 100)}%` }} /></div></section></div> : null}
    </section>
  );
}
