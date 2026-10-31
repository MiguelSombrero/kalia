import { defaultLocale, locales, type Locale } from "@kalia/locales";

export { defaultLocale, locales, type Locale };
export const defaultNamespace = "common";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Next.js's generated route types type `params.locale` as plain `string`,
// so every [locale] page narrows via this; the fallback is defensive, since
// proxy.ts guarantees a valid segment in practice.
export const toLocale = (value: string): Locale => (isLocale(value) ? value : defaultLocale);

export const getOptions = (locale: Locale = defaultLocale, namespace: string = defaultNamespace) => ({
  supportedLngs: locales,
  fallbackLng: defaultLocale,
  lng: locale,
  ns: namespace,
  defaultNS: defaultNamespace,
  // React escapes what it renders; i18next escaping on top turns "Konrad's
  // Stout" into "Konrad&#39;s Stout" in text and aria-labels alike.
  interpolation: { escapeValue: false },
});
