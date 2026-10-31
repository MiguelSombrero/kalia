import { defaultLocale, locales, type Locale } from "@kalia/locales";

const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

export const resolveLocale = (languageCodes: readonly (string | null)[]): Locale =>
  languageCodes.find((code): code is Locale => code !== null && isLocale(code)) ?? defaultLocale;
