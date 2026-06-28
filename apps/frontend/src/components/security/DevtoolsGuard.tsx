import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

function devtoolsLooksOpen() {
  return window.outerWidth - window.innerWidth > 170 || window.outerHeight - window.innerHeight > 170;
}

export function DevtoolsGuard() {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }

    const blockShortcut = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      const developerShortcut =
        event.key === "F12" ||
        (event.ctrlKey && event.shiftKey && ["I", "J", "C"].includes(key)) ||
        (event.ctrlKey && key === "U");

      if (developerShortcut) {
        event.preventDefault();
        setBlocked(true);
      }
    };

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const checkDevtools = () => {
      if (devtoolsLooksOpen()) {
        setBlocked(true);
      }
    };

    window.addEventListener("keydown", blockShortcut, true);
    window.addEventListener("contextmenu", blockContextMenu, true);
    const interval = window.setInterval(checkDevtools, 1_200);
    checkDevtools();

    return () => {
      window.removeEventListener("keydown", blockShortcut, true);
      window.removeEventListener("contextmenu", blockContextMenu, true);
      window.clearInterval(interval);
    };
  }, []);

  if (!blocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/95 px-4 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-lg border border-magentaGlow/40 bg-panel p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-magentaGlow/40 bg-magentaGlow/10 text-pink-200">
          <ShieldAlert size={28} />
        </div>
        <h2 className="mt-4 text-2xl font-black text-white">{t("security.devtoolsTitle")}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{t("security.devtoolsGlobalBody")}</p>
        <Button type="button" variant="danger" className="mt-5 w-full" onClick={() => window.location.reload()}>
          {t("security.devtoolsGlobalAction")}
        </Button>
      </div>
    </div>
  );
}
