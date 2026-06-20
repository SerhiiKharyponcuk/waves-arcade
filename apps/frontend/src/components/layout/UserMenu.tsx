import { useState } from "react";
import { BookOpen, Gamepad2, LifeBuoy, ListChecks, LogIn, LogOut, Menu, PackageOpen, Palette, Settings, Trophy, UserPlus, UserRound } from "lucide-react";
import type { AppView } from "../../store/uiStore";

interface UserMenuProps {
  isGuest: boolean;
  navigate: (view: AppView) => void;
  requestAuthentication: (mode: "login" | "register") => void;
  logout: () => void;
}

export function UserMenu({ isGuest, navigate, requestAuthentication, logout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const accountItems: Array<{ label: string; view: AppView; icon: typeof UserRound }> = [
    { label: "Profile", view: "profile", icon: UserRound },
    { label: "Settings", view: "settings", icon: Settings },
    { label: "My skins", view: "inventory", icon: PackageOpen },
    { label: "My themes", view: "themes", icon: Palette },
    { label: "My scores", view: "profile", icon: Trophy },
    { label: "Achievements", view: "profile", icon: ListChecks },
    { label: "Support", view: "support", icon: LifeBuoy },
    { label: "Rules", view: "rules", icon: BookOpen }
  ];
  const guestItems: Array<{ label: string; view: AppView; icon: typeof UserRound }> = [
    { label: "Play", view: "play", icon: Gamepad2 },
    { label: "Limited settings", view: "settings", icon: Settings },
    { label: "Rules", view: "rules", icon: BookOpen },
    { label: "Support", view: "support", icon: LifeBuoy }
  ];

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-200 hover:border-cyanGlow hover:text-white" aria-label="User menu" title="User menu"><Menu size={20} /></button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-white/10 bg-panel p-2 shadow-2xl">
          {isGuest ? <div className="mb-2 rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-xs leading-5 text-slate-200"><strong className="block text-goldGlow">Guest access</strong>Scores and progress stay on this device.</div> : null}
          {(isGuest ? guestItems : accountItems).map((item) => {
            const Icon = item.icon;
            return <button key={`${item.label}-${item.view}`} type="button" onClick={() => { navigate(item.view); setOpen(false); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"><Icon size={17} />{item.label}</button>;
          })}
          <div className="my-2 border-t border-white/10" />
          {isGuest ? <><button type="button" onClick={() => requestAuthentication("login")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-cyanGlow hover:bg-white/10"><LogIn size={17} />Log in</button><button type="button" onClick={() => requestAuthentication("register")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-cyanGlow hover:bg-white/10"><UserPlus size={17} />Create account</button><button type="button" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-slate-400 hover:bg-white/10"><Gamepad2 size={17} />Continue as guest</button></> : <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-pink-200 hover:bg-white/10"><LogOut size={17} />Logout</button>}
        </div>
      ) : null}
    </div>
  );
}
