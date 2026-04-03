import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { loadLanguage, saveLanguage } from "@/components/settings/utils";

import en from "@/locales/en.json";
import th from "@/locales/th.json";

const resources = {
  en: { translation: en },
  th: { translation: th },
};

const savedLanguage = loadLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Listen for language changes and save to localStorage
i18n.on("languageChanged", (lng) => {
  saveLanguage(lng);
});

export default i18n;
