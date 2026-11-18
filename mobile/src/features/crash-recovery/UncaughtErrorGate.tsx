import type { ReactNode } from "react";

import { useDeviceLocale } from "@/lib/i18n/useDeviceLocale";

import { CrashScreen } from "./CrashScreen";
import { useUncaughtErrorStore } from "./store";

type UncaughtErrorGateProps = { children: ReactNode };

export const UncaughtErrorGate = ({ children }: UncaughtErrorGateProps) => {
  const error = useUncaughtErrorStore((state) => state.error);
  const clear = useUncaughtErrorStore((state) => state.clear);
  const locale = useDeviceLocale();

  if (error) {
    return (
      <CrashScreen locale={locale} error={error} onRestart={clear} />
    );
  }
  return <>{children}</>;
};
