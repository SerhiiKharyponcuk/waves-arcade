import { useState } from "react";
import { BookOpen, Gamepad2, LifeBuoy, ListChecks, LogIn, LogOut, Menu, PackageOpen, Palette, Settings, Trophy, UserPlus, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AppView } from "../../store/uiStore";

interface UserMenuProps {
  isGuest: boolean;
  navigate: (view: AppView) => void;
  requestAuthentication: (mode: "login" | "register") => void;
  logout: () => void;
}

export function UserMenu({ isGuest, navigate, requestAuthentication, logout }: UserMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const accountItems: Array<{ labelKey: string; view: AppView; icon: typeof UserRound }> = [
    { labelKey: "nav.profile", view: "profile", icon: UserRound },
    { labelKey: "nav.settings", view: "settings", icon: Settings },
    { labelKey: "userMenu.mySkins", view: "inventory", icon: PackageOpen },
    { labelKey: "userMenu.myThemes", view: "themes", icon: Palette },
    { labelKey: "userMenu.myScores", view: "profile", icon: Trophy },
    { labelKey: "progression.achievements", view: "profile", icon: ListChecks },
    { labelKey: "nav.support", view: "support", icon: LifeBuoy },
    { labelKey: "nav.rules", view: "rules", icon: BookOpen }
  ];
  const guestItems: Array<{ labelKey: string; view: AppView; icon: typeof UserRound }> = [
    { labelKey: "nav.play", view: "play", icon: Gamepad2 },
    { labelKey: "userMenu.limitedSettings", view: "settings", icon: Settings },
    { labelKey: "nav.rules", view: "rules", icon: BookOpen },
    { labelKey: "nav.support", view: "support", icon: LifeBuoy }
  ];

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-200 hover:border-cyanGlow hover:text-white" aria-label={t("userMenu.title")} title={t("userMenu.title")}><Menu size={20} /></button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-white/10 bg-panel p-2 shadow-2xl">
          {isGuest ? <div className="mb-2 rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-xs leading-5 text-slate-200"><strong className="block text-goldGlow">{t("guest.access")}</strong>{t("guest.deviceOnly")}</div> : null}
          {(isGuest ? guestItems : accountItems).map((item) => {
            const Icon = item.icon;
            return <button key={`${item.labelKey}-${item.view}`} type="button" onClick={() => { navigate(item.view); setOpen(false); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"><Icon size={17} />{t(item.labelKey)}</button>;
          })}
          <div className="my-2 border-t border-white/10" />
          {isGuest ? <><button type="button" onClick={() => requestAuthentication("login")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-cyanGlow hover:bg-white/10"><LogIn size={17} />{t("auth.login")}</button><button type="button" onClick={() => requestAuthentication("register")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-cyanGlow hover:bg-white/10"><UserPlus size={17} />{t("guest.createAccount")}</button><button type="button" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-slate-400 hover:bg-white/10"><Gamepad2 size={17} />{t("guest.continue")}</button></> : <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-pink-200 hover:bg-white/10"><LogOut size={17} />{t("auth.logout")}</button>}
        </div>
      ) : null}
    </div>
  );
}
