import { BookOpen, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { gameRuleSections } from "../data/gameRules";
import { Button } from "../components/ui/Button";

interface RulesPageProps {
  onClose: () => void;
}

export function RulesPage({ onClose }: RulesPageProps) {
  const { t } = useTranslation();

  return (
    <section className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
            <BookOpen size={17} />
            {t("rulesPage.title")}
          </div>
          <h1 className="text-4xl font-black text-white neon-text">{t("rulesPage.heading")}</h1>
          <p className="mt-3 leading-7 text-slate-300">
            {t("rulesPage.intro")}
          </p>
        </div>
        <Button type="button" variant="ghost" className="h-11 w-11 shrink-0 border border-white/15 bg-white/5 px-0" onClick={onClose} icon={<X size={19} />} aria-label={t("common.close")} title={t("common.close")}>
          <span className="sr-only">{t("common.close")}</span>
        </Button>
      </header>

      <div className="rounded-lg border border-goldGlow/30 bg-goldGlow/10 p-4 text-sm leading-6 text-slate-200">
        <div className="mb-1 flex items-center gap-2 font-black text-goldGlow"><ShieldCheck size={18} /> {t("rulesPage.securityTitle")}</div>
        {t("rulesPage.securityBody")}
      </div>

      <div className="grid gap-5">
        {gameRuleSections.map((section) => (
          <article key={section.title} className="arcade-border rounded-lg p-5">
            <h2 className="text-xl font-black text-white">{t(`rulesPage.categories.${section.key}`, section.title)}</h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-300" start={section.start}>
              {section.rules.map((rule, index) => <li key={rule} className="ml-6 pl-2">{t(`ruleTexts.${section.key}.${index}`, rule)}</li>)}
            </ol>
          </article>
        ))}
      </div>

      <Button type="button" variant="secondary" className="justify-self-center" onClick={onClose} icon={<X size={18} />}>
        {t("common.close")}
      </Button>
    </section>
  );
}
