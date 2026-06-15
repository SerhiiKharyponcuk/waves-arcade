import { Suspense, lazy } from "react";
import { Gamepad2, LogOut, PackageOpen, Settings, ShoppingBag, Trophy, UserRound, WalletCards } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { type AppView, useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";

const GamePage = lazy(() => import("../../pages/GamePage").then((module) => ({ default: module.GamePage })));
const ShopPage = lazy(() => import("../../pages/ShopPage").then((module) => ({ default: module.ShopPage })));
const InventoryPage = lazy(() => import("../../pages/InventoryPage").then((module) => ({ default: module.InventoryPage })));
const ProfilePage = lazy(() => import("../../pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const PremiumPage = lazy(() => import("../../pages/PremiumPage").then((module) => ({ default: module.PremiumPage })));
const SettingsPage = lazy(() => import("../../pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));

const navItems: Array<{ view: AppView; icon: typeof Gamepad2; labelKey: string }> = [
  { view: "play", icon: Gamepad2, labelKey: "nav.play" },
  { view: "shop", icon: ShoppingBag, labelKey: "nav.shop" },
  { view: "inventory", icon: PackageOpen, labelKey: "nav.inventory" },
  { view: "premium", icon: WalletCards, labelKey: "nav.premium" },
  { view: "profile", icon: Trophy, labelKey: "nav.profile" },
  { view: "settings", icon: Settings, labelKey: "nav.settings" }
];

export function MainShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { view, setView } = useUiStore();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => setView("play")} className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-cyanGlow text-ink shadow-neon">
              <Gamepad2 size={22} />
            </div>
            <div className="min-w-0 text-left">
              <div className="truncate text-lg font-black text-white neon-text">{t("brand")}</div>
              <div className="truncate text-xs text-slate-400">{user?.profile.displayName}</div>
            </div>
          </button>

          <div className="hidden items-center gap-3 md:flex">
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
          </div>
        </div>

        <nav className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 pb-3 sm:grid-cols-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-2 text-sm font-bold transition ${
                  active
                    ? "border-cyanGlow bg-cyanGlow text-ink shadow-neon"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-cyanGlow hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
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
          {view === "premium" ? <PremiumPage /> : null}
          {view === "profile" ? <ProfilePage /> : null}
          {view === "settings" ? <SettingsPage /> : null}
        </Suspense>
      </main>

      <button
        type="button"
        onClick={() => setView("profile")}
        className="fixed bottom-4 right-4 z-30 grid h-12 w-12 place-items-center rounded-md border border-white/10 bg-panel text-cyanGlow shadow-neon md:hidden"
        aria-label={t("nav.profile")}
        title={t("nav.profile")}
      >
        <UserRound size={20} />
      </button>
    </div>
  );
}
