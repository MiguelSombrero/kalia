import { AppGate } from "@/features/app-config";
import { CrashBoundary, installUncaughtErrorHandler, UncaughtErrorGate } from "@/features/crash-recovery";
import { useDeviceLocale } from "@/lib/i18n/useDeviceLocale";
import { registerMobileTransport } from "@/lib/api/registerTransport";
import { AppProviders } from "@/lib/providers/AppProviders";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

registerMobileTransport();
installUncaughtErrorHandler();

export const ErrorBoundary = CrashBoundary;

const RootLayout = () => {
  const locale = useDeviceLocale();

  return (
    <UncaughtErrorGate>
      <AppProviders locale={locale}>
        <StatusBar style="dark" />
        <AppGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AppGate>
      </AppProviders>
    </UncaughtErrorGate>
  );
};

export default RootLayout;
