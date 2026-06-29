import { useTranslation } from "react-i18next";

interface AppLoaderProps {
  fullscreen?: boolean;
  compact?: boolean;
  label?: string;
  subtitle?: string;
}

export function AppLoader({ fullscreen = false, compact = false, label, subtitle }: AppLoaderProps) {
  const { t } = useTranslation();
  const title = label ?? t("loader.title");
  const body = subtitle ?? t("loader.subtitle");

  return (
    <div className={fullscreen ? "grid min-h-screen place-items-center px-4" : `grid place-items-center rounded-lg border border-white/10 bg-white/[0.03] p-6 ${compact ? "min-h-56" : "min-h-72"}`}>
      <div className={`w-full text-center ${compact ? "max-w-md" : "max-w-sm"}`}>
        <div className={`mx-auto grid place-items-center rounded-[1.75rem] border border-cyanGlow/30 bg-ink/80 shadow-neon ${compact ? "h-20 w-20" : "h-24 w-24"}`}>
          <div className={`relative ${compact ? "h-12 w-12" : "h-14 w-14"}`}>
            <span className="absolute inset-0 rounded-full border-2 border-cyanGlow/20" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyanGlow border-r-goldGlow animate-spin motion-reduce:animate-none" />
            <span className="absolute inset-[0.7rem] rounded-full border border-cyanGlow/20 opacity-70" />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyanGlow shadow-neon" />
          </div>
        </div>
        <div className={`mt-5 font-black text-white neon-text ${compact ? "text-base sm:text-lg" : "text-lg"}`}>{title}</div>
        <div className="mt-2 text-sm leading-6 text-slate-400">{body}</div>
        <div className="mx-auto mt-5 flex max-w-56 items-center justify-center gap-2">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="loader-bar h-1.5 flex-1 rounded-full bg-white/10"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          <span className="rounded-full border border-white/10 px-2 py-1">{t("loader.status.security")}</span>
          <span className="rounded-full border border-white/10 px-2 py-1">{t("loader.status.sync")}</span>
          <span className="rounded-full border border-white/10 px-2 py-1">{t("loader.status.render")}</span>
        </div>
      </div>
    </div>
  );
}
