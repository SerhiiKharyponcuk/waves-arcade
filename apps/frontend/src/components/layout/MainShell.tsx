import { Suspense, lazy, useEffect, useState } from "react";
import { BookOpen, Gamepad2, LifeBuoy, Lock, LogIn, LogOut, PackageOpen, Palette, Settings, ShieldCheck, ShoppingBag, Trophy, UserPlus, UserRound, WalletCards } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useGuestStore } from "../../store/guestStore";
import { type AppView, useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { AccountRequiredModal } from "../auth/AccountRequiredModal";
import { Modal } from "../ui/Modal";
import { authApi } from "../../services/authApi";
import { UserMenu } from "./UserMenu";

const GamePage = lazy(() => import("../../pages/GamePage").then((module) => ({ default: module.GamePage })));
const ShopPage = lazy(() => import("../../pages/ShopPage").then((module) => ({ default: module.ShopPage })));
const InventoryPage = lazy(() => import("../../pages/InventoryPage").then((module) => ({ default: module.InventoryPage })));
const ProfilePage = lazy(() => import("../../pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const PremiumPage = lazy(() => import("../../pages/PremiumPage").then((module) => ({ default: module.PremiumPage })));
const SupportPage = lazy(() => import("../../pages/SupportPage").then((module) => ({ default: module.SupportPage })));
const SettingsPage = lazy(() => import("../../pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const AdminPage = lazy(() => import("../../pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const RulesPage = lazy(() => import("../../pages/RulesPage").then((module) => ({ default: module.RulesPage })));
const ThemesPage = lazy(() => import("../../pages/ThemesPage").then((module) => ({ default: module.ThemesPage })));

const navItems: Array<{ view: AppView; icon: typeof Gamepad2; labelKey: string }> = [
  { view: "play", icon: Gamepad2, labelKey: "nav.play" },
  { view: "shop", icon: ShoppingBag, labelKey: "nav.shop" },
  { view: "inventory", icon: PackageOpen, labelKey: "nav.inventory" },
  { view: "themes", icon: Palette, labelKey: "nav.themes" },
  { view: "premium", icon: WalletCards, labelKey: "nav.premium" },
  { view: "profile", icon: Trophy, labelKey: "nav.profile" },
  { view: "support", icon: LifeBuoy, labelKey: "nav.support" },
  { view: "settings", icon: Settings, labelKey: "nav.settings" },
  { view: "rules", icon: BookOpen, labelKey: "nav.rules" }
];

const guestLockedViews = new Set<AppView>(["inventory", "premium", "profile"]);

export function MainShell() {
  const { t } = useTranslation();
  const { user, logout, replaceUser } = useAuthStore();
  const { active: guestActive, session: guestSession, requestAuthentication, clearProgress } = useGuestStore();
  const { view, setView } = useUiStore();
  const [dismissedNoticeId, setDismissedNoticeId] = useState("");
  const [accountRequired, setAccountRequired] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState("");
  const visibleNavItems = user?.role === "ADMIN"
    ? [...navItems, { view: "admin" as AppView, icon: ShieldCheck, labelKey: "nav.admin" }]
    : navItems;
  const latestNotice = user?.moderationNotices.find((notice) => notice.action !== "CHEAT_FLAG");
  const isGuest = guestActive && !user;

  useEffect(() => {
    if (user && guestSession && guestSession.gamesPlayed > 0) {
      setTransferOpen(true);
    }
  }, [guestSession?.guestId, user?.id]);

  useEffect(() => {
    if (user?.mustChangePassword) {
      setView("settings");
    }
  }, [setView, user?.mustChangePassword]);

  async function transferGuestProgress() {
    if (!guestSession) return;
    setTransferBusy(true);
    setTransferError("");
    try {
      const result = await authApi.transferGuestProgress({
        guestId: guestSession.guestId,
        gamesPlayed: guestSession.gamesPlayed,
        bestGuestScore: guestSession.bestGuestScore,
        selectedBasicTheme: guestSession.selectedBasicTheme,
        selectedBasicSkin: guestSession.selectedBasicSkin,
        selectedBasicControls: { ...guestSession.selectedBasicControls },
        temporarySettings: { ...guestSession.temporarySettings },
        temporaryCoins: 0
      });
      replaceUser(result.user);
      clearProgress();
      setTransferOpen(false);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "Guest progress could not be transferred.");
    } finally {
      setTransferBusy(false);
    }
  }

  function navigate(nextView: AppView) {
    if (user?.mustChangePassword && nextView !== "settings" && nextView !== "rules" && nextView !== "support") {
      setView("settings");
      return;
    }
    if (isGuest && guestLockedViews.has(nextView)) {
      setAccountRequired(true);
      return;
    }
    setView(nextView);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("play")} className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-cyanGlow text-ink shadow-neon">
              <Gamepad2 size={22} />
            </div>
            <div className="min-w-0 text-left">
              <div className="truncate text-lg font-black text-white neon-text">{t("brand")}</div>
              <div className="truncate text-xs text-slate-400">{user?.profile.displayName ?? "Guest - limited access"}</div>
            </div>
          </button>

          <div className="hidden items-center gap-3 md:flex">
            {isGuest ? (
              <>
                <Button type="button" variant="ghost" onClick={() => requestAuthentication("login")} icon={<LogIn size={18} />}>
                  Log in
                </Button>
                <Button type="button" onClick={() => requestAuthentication("register")} icon={<UserPlus size={18} />}>
                  Create account
                </Button>
              </>
            ) : (
              <>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-goldGlow">
              <WalletCards size={17} />
              {user?.wallet.coins ?? 0}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void logout()}
              icon={<LogOut size={18} />}
            >
              {t("auth.logout")}
            </Button>
              </>
            )}
          </div>
          <UserMenu isGuest={isGuest} navigate={navigate} requestAuthentication={requestAuthentication} logout={() => void logout()} />
        </div>

        <nav className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 pb-3 sm:grid-cols-7 lg:grid-cols-8">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => navigate(item.view)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-2 text-sm font-bold transition ${
                  active
                    ? "border-cyanGlow bg-cyanGlow text-ink shadow-neon"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-cyanGlow hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{t(item.labelKey)}</span>
                {isGuest && guestLockedViews.has(item.view) ? <Lock size={13} aria-label="Account required" /> : null}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {latestNotice && latestNotice.id !== dismissedNoticeId ? (
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-cyanGlow/30 bg-cyanGlow/10 p-4 text-sm text-cyanGlow sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-black text-white">{t("admin.noticeTitle")}</div>
              <div className="mt-1 text-slate-200">{latestNotice.message ?? latestNotice.reason}</div>
            </div>
            <Button type="button" variant="ghost" onClick={() => setDismissedNoticeId(latestNotice.id)}>
              {t("common.close")}
            </Button>
          </div>
        ) : null}
        {user?.activeRestrictions.map((restriction) => (
          <div key={restriction.id} className="mb-4 rounded-lg border border-magentaGlow/30 bg-magentaGlow/10 p-4 text-sm leading-6 text-slate-200">
            <div className="font-black text-pink-200">{restriction.type.replaceAll("_", " ")}</div>
            <div>{restriction.reason}</div>
            <div className="mt-1 text-xs text-slate-400">{restriction.endsAt ? `Temporary until ${new Date(restriction.endsAt).toLocaleString()}` : "No automatic end date"}. {restriction.appealPossible ? "You may contact Support to appeal." : "Appeal is not available."}</div>
          </div>
        ))}
        <Suspense
          fallback={
            <div className="arcade-border rounded-lg p-6 text-sm font-bold text-slate-300">
              {t("common.loading")}
            </div>
          }
        >
          {view === "play" ? <GamePage /> : null}
          {view === "shop" ? <ShopPage /> : null}
          {view === "inventory" ? <InventoryPage /> : null}
          {view === "themes" ? <ThemesPage /> : null}
          {view === "premium" ? <PremiumPage /> : null}
          {view === "profile" ? <ProfilePage /> : null}
          {view === "support" ? <SupportPage /> : null}
          {view === "settings" ? <SettingsPage /> : null}
          {view === "rules" ? <RulesPage /> : null}
          {view === "admin" && user?.role === "ADMIN" ? <AdminPage /> : null}
        </Suspense>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-5 text-xs text-slate-400">
        <span>{isGuest ? "Guest progress is stored only on this device." : "Account progress is saved securely."}</span>
        <button type="button" className="font-bold text-cyanGlow hover:text-white" onClick={() => navigate("rules")}>
          Game Rules and Terms
        </button>
      </footer>

      <button
        type="button"
        onClick={() => navigate(isGuest ? "settings" : "profile")}
        className="fixed bottom-4 right-4 z-30 grid h-12 w-12 place-items-center rounded-md border border-white/10 bg-panel text-cyanGlow shadow-neon md:hidden"
        aria-label={isGuest ? t("nav.settings") : t("nav.profile")}
        title={isGuest ? t("nav.settings") : t("nav.profile")}
      >
        <UserRound size={20} />
      </button>

      {accountRequired ? (
        <AccountRequiredModal
          onLogin={() => requestAuthentication("login")}
          onRegister={() => requestAuthentication("register")}
          onContinue={() => setAccountRequired(false)}
        />
      ) : null}

      {transferOpen && user && guestSession ? (
        <Modal title="Save guest progress" closeLabel="Not now" onClose={() => setTransferOpen(false)}>
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-300">Do you want to save your guest progress to this account?</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <span className="block text-xs font-black uppercase text-slate-500">Local best</span>
                <strong className="mt-1 block text-xl text-white">{guestSession.bestGuestScore}</strong>
              </div>
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <span className="block text-xs font-black uppercase text-slate-500">Games</span>
                <strong className="mt-1 block text-xl text-white">{guestSession.gamesPlayed}</strong>
              </div>
            </div>
            <p className="text-xs leading-5 text-slate-400">Only plausible scores and basic settings are transferred. Local coins, premium items, and unverified rewards are ignored.</p>
            {transferError ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{transferError}</div> : null}
            <Button type="button" disabled={transferBusy} onClick={() => void transferGuestProgress()}>Save progress</Button>
            <Button type="button" variant="ghost" onClick={() => setTransferOpen(false)}>Not now</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
