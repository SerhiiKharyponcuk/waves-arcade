import { useTranslation } from "react-i18next";

export function AppLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  const { t } = useTranslation();

  return (
    <div className={fullscreen ? "grid min-h-screen place-items-center px-4" : "grid min-h-72 place-items-center rounded-lg border border-white/10 bg-white/[0.03] p-6"}>
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-cyanGlow/30 bg-ink/80 shadow-neon">
          <div className="relative h-14 w-14">
            <span className="absolute inset-0 rounded-full border-2 border-cyanGlow/20" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyanGlow border-r-goldGlow animate-spin" />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyanGlow shadow-neon" />
          </div>
        </div>
        <div className="mt-5 text-lg font-black text-white neon-text">{t("loader.title")}</div>
        <div className="mt-2 text-sm text-slate-400">{t("loader.subtitle")}</div>
        <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-cyanGlow shadow-neon" />
        </div>
      </div>
    </div>
  );
}
