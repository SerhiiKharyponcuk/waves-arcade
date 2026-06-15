import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { walletApi } from "../services/walletApi";
import { StatCard } from "../components/ui/StatCard";

export function PremiumPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [benefits, setBenefits] = useState<null | { premiumOnlySkins: number; extraDailySpins: number; extraDailyGems: number; extraLivesPerRun: number; noAds: boolean; premiumBadge: string; betterDailyRewards: boolean }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void walletApi.subscriptionBenefits()
      .then((result) => setBenefits(result))
      .catch(() => setBenefits(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          <Sparkles size={17} />
          {t("premium.title")}
        </div>
        <h1 className="text-4xl font-black text-white neon-text">{t("premium.heading")}</h1>
        <p className="mt-2 text-slate-300">{t("premium.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<ShieldCheck size={20} />} label={t("premium.noAds")} value={benefits?.noAds ? t("premium.enabled") : t("premium.disabled")} />
        <StatCard icon={<Star size={20} />} label={t("premium.premiumBadge")} value={benefits?.premiumBadge ?? t("premium.loading")} />
        <StatCard icon={<Sparkles size={20} />} label={t("premium.premiumSkins")} value={benefits?.premiumOnlySkins ?? 0} />
      </div>

      <div className="arcade-border rounded-lg border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        {loading ? (
          <div>{t("common.loading")}</div>
        ) : benefits ? (
          <div className="grid gap-3">
            <div>{t("premium.extraDailySpins", { count: benefits.extraDailySpins })}</div>
            <div>{t("premium.extraDailyGems", { count: benefits.extraDailyGems })}</div>
            <div>{t("premium.extraLivesPerRun", { count: benefits.extraLivesPerRun })}</div>
            <div>{t("premium.betterDailyRewards")}</div>
          </div>
        ) : (
          <div>{t("common.error")}</div>
        )}
      </div>

      <div className="rounded-lg border border-cyanGlow/20 bg-gradient-to-br from-white/5 to-white/10 p-6 text-slate-200">
        <h2 className="mb-3 text-xl font-black text-white">{t("premium.calloutTitle")}</h2>
        <p>{t("premium.calloutText")}</p>
      </div>
    </section>
  );
}
