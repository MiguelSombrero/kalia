import { useLocales } from "expo-localization";
import type { ReactNode } from "react";
import { resolveLocale } from "@/lib/i18n/resolveLocale";
import { CrashScreen } from "./CrashScreen";
import { clearUncaughtError, useUncaughtError } from "./uncaughtError";

export const UncaughtErrorGate = ({ children }: { children: ReactNode }) => {
  const error = useUncaughtError();
  const locales = useLocales();

  if (error) {
    return (
      <CrashScreen
        locale={resolveLocale(locales.map((locale) => locale.languageCode))}
        error={error}
        onRestart={clearUncaughtError}
      />
    );
  }
  return <>{children}</>;
};
