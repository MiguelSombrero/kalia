import { createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { defaultNamespace, getOptions, type Locale } from "./settings";

/**
 * Each call gets its own i18next instance, not a module-level singleton:
 * server components share no React context, and a singleton would not be
 * safe under concurrent requests.
 */
export const getTranslation = async (locale: Locale, namespace: string = defaultNamespace) => {
  const instance = createInstance();
  await instance
    .use(resourcesToBackend((language: string, ns: string) => import(`./locales/${language}/${ns}.json`)))
    .init(getOptions(locale, namespace));
  return {
    t: instance.getFixedT(locale, namespace),
    i18n: instance,
  };
};
