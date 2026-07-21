import { createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { defaultNamespace, getOptions, type Locale } from "./settings";

/**
 * Server components have no shared React context, so each call gets its own
 * i18next instance (createInstance()) rather than a module-level singleton —
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
