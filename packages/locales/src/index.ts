import enCommon from "./en/common.json";
import fiCommon from "./fi/common.json";

/** i18next `resources`: language, then namespace. */
export const resources = {
  en: { common: enCommon },
  fi: { common: fiCommon },
} as const;

export const locales = ["en", "fi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
