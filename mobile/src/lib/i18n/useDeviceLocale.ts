import type { Locale } from "@kalia/locales";
import { useLocales } from "expo-localization";
import { resolveLocale } from "./resolveLocale";

export const useDeviceLocale = (): Locale => resolveLocale(useLocales().map((locale) => locale.languageCode));
