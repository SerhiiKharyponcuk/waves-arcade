import { useTranslation } from "react-i18next";
import type { SupportedLocale } from "@waves/shared";

const languages: SupportedLocale[] = ["en", "nl", "ru", "uk"];

interface LanguageSelectorProps {
  value: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();

  async function changeLanguage(locale: SupportedLocale) {
    localStorage.setItem("waves_locale", locale);
    await i18n.changeLanguage(locale);
    onChange(locale);
  }

  return (
    <div className="grid gap-2">
      <label className="text-sm text-slate-300">{t("settings.language")}</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {languages.map((language) => (
          <button
            key={language}
            type="button"
            onClick={() => void changeLanguage(language)}
            className={`min-h-11 rounded-md border px-3 py-2 text-sm font-bold transition ${
              value === language
                ? "border-cyanGlow bg-cyanGlow text-ink shadow-neon"
                : "border-slate-700 bg-ink/70 text-slate-200 hover:border-cyanGlow"
            }`}
          >
            {t(`language.${language}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
