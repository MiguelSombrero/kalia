import type { ReactNode } from "react";
import { useDeviceLocale } from "@/lib/i18n/useDeviceLocale";
import { CrashScreen } from "./CrashScreen";
import { clearUncaughtError, useUncaughtError } from "./uncaughtError";

export const UncaughtErrorGate = ({ children }: { children: ReactNode }) => {
  const error = useUncaughtError();
  const locale = useDeviceLocale();

  if (error) {
    return (
      <CrashScreen locale={locale} error={error} onRestart={clearUncaughtError} />
    );
  }
  return <>{children}</>;
};
