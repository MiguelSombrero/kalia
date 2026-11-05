import type { ErrorBoundaryProps } from "expo-router";
import { useLocales } from "expo-localization";
import { resolveLocale } from "@/lib/i18n/resolveLocale";
import { CrashScreen } from "./CrashScreen";
import { useLogUncaughtRenderError } from "./uncaughtError";

/** The root layout's `ErrorBoundary` export: catches the layout and every screen under it. */
export const CrashBoundary = ({ error, retry }: ErrorBoundaryProps) => {
  const locales = useLocales();
  useLogUncaughtRenderError(error);

  return (
    <CrashScreen
      locale={resolveLocale(locales.map((locale) => locale.languageCode))}
      error={error}
      onRestart={() => void retry()}
    />
  );
};
