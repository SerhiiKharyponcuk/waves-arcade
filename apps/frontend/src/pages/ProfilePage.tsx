import { useEffect, useState } from "react";
import { Coins, Gem, Medal, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard } from "../components/ui/StatCard";
import { gameApi } from "../services/gameApi";
import { useAuthStore } from "../store/authStore";
import type { LeaderboardResponse } from "../types/api";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    void gameApi.leaderboard().then(setLeaderboard).catch(() => setLeaderboard(null));
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
    </section>
  );
}
