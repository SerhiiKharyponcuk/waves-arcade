import { useEffect, useRef, useState } from "react";
import { Check, Coins, Lock, Palette, Sparkles } from "lucide-react";
import type { GameThemeDto } from "@waves/shared";
import { AccountRequiredModal } from "../components/auth/AccountRequiredModal";
import { Button } from "../components/ui/Button";
import { ApiRequestError } from "../services/apiClient";
import { authApi } from "../services/authApi";
import { shopApi } from "../services/shopApi";
import { useAuthStore } from "../store/authStore";
import { useGuestStore } from "../store/guestStore";
import { useTranslation } from "react-i18next";

type ThemeItem = GameThemeDto & { owned: boolean; equipped: boolean; canUnlockByScore: boolean };
const guestThemeIds = new Set(["classic-neon", "dark-space", "cyber-grid"]);

export function ThemesPage() {
  const { t } = useTranslation();
  const { user, replaceUser } = useAuthStore();
  const { active: guestActive, session, updateSession, requestAuthentication } = useGuestStore();
  const isGuest = guestActive && !user;
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [accountRequired, setAccountRequired] = useState(false);
  const pendingThemeActions = useRef(new Set<string>());

  useEffect(() => {
    void shopApi.themes().then(setThemes).catch((error) => setError(error instanceof Error ? error.message : t("themesPage.loadError")));
  }, [t]);

  async function selectTheme(theme: ThemeItem) {
    if (isGuest) {
      if (!guestThemeIds.has(theme.id)) {
        setAccountRequired(true);
        return;
      }
      updateSession((current) => ({ ...current, selectedBasicTheme: theme.id }));
      return;
    }

    if (pendingThemeActions.current.has(theme.id)) {
      return;
    }
    pendingThemeActions.current.add(theme.id);
    setBusyId(theme.id);
    setError("");
    try {
      const next = theme.owned ? await shopApi.equipTheme(theme.id) : await shopApi.unlockTheme(theme.id);
      setThemes(next);
      if (!theme.owned) setThemes(await shopApi.equipTheme(theme.id));
      replaceUser(await authApi.me());
    } catch (error) {
      setError(error instanceof ApiRequestError && error.code === "PURCHASE_CONFLICT" ? t("shop.purchaseProcessing") : error instanceof Error ? error.message : t("themesPage.selectError"));
    } finally {
      pendingThemeActions.current.delete(theme.id);
      setBusyId("");
    }
  }

  return (
    <section className="grid gap-6">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink"><Palette size={17} /> {t("themesPage.title")}</div>
        <h1 className="text-4xl font-black text-white neon-text">{t("themesPage.heading")}</h1>
        <p className="mt-2 max-w-2xl text-slate-300">{t("themesPage.subtitle")}</p>
      </header>

      {isGuest ? <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-4 text-sm text-slate-200">{t("themesPage.guestNotice")}</div> : null}
      {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => {
          const guestOwned = isGuest && guestThemeIds.has(theme.id);
          const selected = isGuest ? session?.selectedBasicTheme === theme.id : theme.equipped;
          const available = isGuest ? guestOwned : theme.owned;
          return (
            <article key={theme.id} className={`overflow-hidden rounded-lg border bg-panel ${selected ? "border-cyanGlow shadow-neon" : "border-white/10"}`}>
              <div className="h-28 p-4" style={{ backgroundColor: theme.backgroundStyle }}>
                <div className="h-2 rounded-full" style={{ backgroundColor: theme.playerTrailStyle, boxShadow: `0 0 18px ${theme.playerTrailStyle}` }} />
                <div className="mt-5 flex gap-3">
                  {[0, 1, 2].map((item) => <span key={item} className="h-8 w-8 rotate-45 border-2" style={{ borderColor: theme.obstacleStyle }} />)}
                </div>
              </div>
              <div className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-black text-white">{t(`themesPage.items.${theme.id}.name`, theme.name)}</h2><p className="mt-1 text-xs text-slate-400">{theme.type === "free" ? t("themesPage.availableEveryone") : theme.type === "premium" ? t("themesPage.premiumEntitlement") : t("themesPage.unlockCondition", { score: theme.priceCoins * 10, coins: theme.priceCoins })}</p></div>
                  <span className="rounded-md px-2 py-1 text-xs font-black uppercase" style={{ color: theme.uiAccentColor, backgroundColor: `${theme.uiAccentColor}20` }}>{t(`themesPage.types.${theme.type}`)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400"><Sparkles size={14} /> {t(`themesPage.items.${theme.id}.particles`, theme.particleStyle)}</div>
                <Button
                  type="button"
                  variant={selected ? "secondary" : "primary"}
                  disabled={busyId === theme.id || selected}
                  onClick={() => void selectTheme(theme)}
                  icon={selected ? <Check size={17} /> : available ? <Palette size={17} /> : theme.type === "unlockable" ? <Coins size={17} /> : <Lock size={17} />}
                >
                  {selected ? t("themesPage.equipped") : available ? t("themesPage.equip") : theme.type === "unlockable" ? t("themesPage.coinsOrScore", { coins: theme.priceCoins }) : t("themesPage.unlock")}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {accountRequired ? <AccountRequiredModal message={t("themesPage.accountRequired")} onLogin={() => requestAuthentication("login")} onRegister={() => requestAuthentication("register")} onContinue={() => setAccountRequired(false)} /> : null}
    </section>
  );
}
