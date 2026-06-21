import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import nl from "./locales/nl.json";
import ru from "./locales/ru.json";
import uk from "./locales/uk.json";

const savedLanguage = localStorage.getItem("waves_locale") ?? "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    nl: { translation: nl },
    ru: { translation: ru },
    uk: { translation: uk }
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
}).then(() => {
  document.documentElement.lang = i18n.resolvedLanguage ?? "en";
});

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

export { i18n };
