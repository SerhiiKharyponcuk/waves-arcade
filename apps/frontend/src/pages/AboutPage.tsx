import { Gamepad2, LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";

interface AboutPageProps {
  onSupport: () => void;
}

export function AboutPage({ onSupport }: AboutPageProps) {
  const { t } = useTranslation();

  return (
    <section className="grid gap-8">
      <header className="max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          <Gamepad2 size={17} />
          {t("brand")}
        </div>
        <h1 className="text-4xl font-black text-white neon-text">{t("aboutPage.title")}</h1>
        <p className="mt-3 text-base leading-7 text-slate-300">{t("aboutPage.intro")}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <article className="border-l-2 border-cyanGlow pl-4">
          <Sparkles className="mb-3 text-cyanGlow" size={22} />
          <h2 className="font-black text-white">{t("aboutPage.gameplayTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{t("aboutPage.gameplayBody")}</p>
        </article>
        <article className="border-l-2 border-goldGlow pl-4">
          <ShieldCheck className="mb-3 text-goldGlow" size={22} />
          <h2 className="font-black text-white">{t("aboutPage.fairPlayTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{t("aboutPage.fairPlayBody")}</p>
        </article>
        <article className="border-l-2 border-magentaGlow pl-4">
          <LifeBuoy className="mb-3 text-pink-300" size={22} />
          <h2 className="font-black text-white">{t("aboutPage.supportTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{t("aboutPage.supportBody")}</p>
        </article>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
        <p className="max-w-2xl text-sm leading-6 text-slate-400">{t("aboutPage.availability")}</p>
        <Button type="button" variant="secondary" onClick={onSupport} icon={<LifeBuoy size={18} />}>
          {t("aboutPage.contactSupport")}
        </Button>
      </div>
    </section>
  );
}
