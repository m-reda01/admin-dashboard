import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations.js";

const I18nContext = createContext(null);
const LANGUAGE_STORAGE_KEY = "docschain_admin_language";
const supportedLanguages = ["en", "ar"];

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => getInitialLanguage());

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  function setLanguage(nextLanguage) {
    if (supportedLanguages.includes(nextLanguage)) {
      setLanguageState(nextLanguage);
    }
  }

  const value = useMemo(
    () => ({
      direction: language === "ar" ? "rtl" : "ltr",
      language,
      setLanguage,
      t: createTranslator(language),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return supportedLanguages.includes(savedLanguage) ? savedLanguage : getDeviceLanguage();
}

function getDeviceLanguage() {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const browserLanguages = [...(navigator.languages || []), navigator.language].filter(Boolean);
  return browserLanguages.some((item) => item.toLowerCase().startsWith("ar")) ? "ar" : "en";
}

function createTranslator(language) {
  return function t(key, params = {}) {
    const value = key.split(".").reduce((current, part) => current?.[part], translations[language]);
    const fallback = key.split(".").reduce((current, part) => current?.[part], translations.en);
    const template = value || fallback || key;

    return Object.entries(params).reduce(
      (text, [paramKey, paramValue]) => text.replaceAll(`{${paramKey}}`, String(paramValue)),
      template,
    );
  };
}
