import { defaultLocale, locales, resources, type Locale } from "@kalia/locales";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

const defaultNamespace = "common";

export const createI18n = (locale: Locale) => {
  const instance = createInstance();
  instance.use(initReactI18next).init({
    resources,
    supportedLngs: locales,
    fallbackLng: defaultLocale,
    lng: locale,
    ns: defaultNamespace,
    defaultNS: defaultNamespace,
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return instance;
};
