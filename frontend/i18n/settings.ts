export const locales = ["en", "fi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const defaultNamespace = "common";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/**
 * Narrows a raw route param to Locale. Next.js's generated route types type
 * `params.locale` as plain `string` (it can't see our union from the folder
 * name), so every [locale] page/layout takes `string` and narrows via this
 * — falling back to defaultLocale is defensive only; proxy.ts guarantees a
 * valid segment in practice.
 */
export const toLocale = (value: string): Locale => (isLocale(value) ? value : defaultLocale);

export const getOptions = (locale: Locale = defaultLocale, namespace: string = defaultNamespace) => ({
  supportedLngs: locales,
  fallbackLng: defaultLocale,
  lng: locale,
  ns: namespace,
  defaultNS: defaultNamespace,
});
