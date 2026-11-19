import { defaultLocale, isLocale, type Locale } from "@kalia/locales";

export const resolveLocale = (languageCodes: readonly (string | null)[]): Locale =>
  languageCodes.find((code): code is Locale => code !== null && isLocale(code)) ?? defaultLocale;
