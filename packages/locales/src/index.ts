import enCommon from "./en/common.json";
import fiCommon from "./fi/common.json";

/** i18next `resources`: language, then namespace. */
export const resources = {
  en: { common: enCommon },
  fi: { common: fiCommon },
} as const;

/** For an i18next backend that loads a language on demand. */
export const loadResource = (language: string, namespace: string) => import(`./${language}/${namespace}.json`);
