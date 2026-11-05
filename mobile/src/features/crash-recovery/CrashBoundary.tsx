import type { ErrorBoundaryProps } from "expo-router";
import { useDeviceLocale } from "@/lib/i18n/useDeviceLocale";
import { CrashScreen } from "./CrashScreen";
import { useLogUncaughtRenderError } from "./uncaughtError";

/** The root layout's `ErrorBoundary` export: catches the layout and every screen under it. */
export const CrashBoundary = ({ error, retry }: ErrorBoundaryProps) => {
  const locale = useDeviceLocale();
  useLogUncaughtRenderError(error);

  return <CrashScreen locale={locale} error={error} onRestart={() => void retry()} />;
};
