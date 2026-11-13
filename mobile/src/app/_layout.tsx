import { useThemeColors } from "@/lib/design/useThemeColors";
import { AppGate } from "@/features/app-config";
import { FontGate } from "@/lib/design/FontGate";
import { CrashBoundary, installUncaughtErrorHandler, UncaughtErrorGate } from "@/features/crash-recovery";
import { useDeviceLocale } from "@/lib/i18n/useDeviceLocale";
import { registerMobileTransport } from "@/lib/api/registerTransport";
import { AppProviders } from "@/lib/providers/AppProviders";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

registerMobileTransport();
installUncaughtErrorHandler();

export const ErrorBoundary = CrashBoundary;

const RootLayout = () => {
  const locale = useDeviceLocale();
  const colors = useThemeColors();

  return (
    <UncaughtErrorGate>
      <FontGate>
        <AppProviders locale={locale}>
          <StatusBar style="auto" />
          <AppGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="add-sheet" options={{ presentation: "formSheet", sheetAllowedDetents: Platform.OS === "android" ? [0.9] : [0.5, 0.9] }} />
              <Stack.Screen name="sign-in-sheet" options={{ presentation: "formSheet", sheetAllowedDetents: Platform.OS === "android" ? [0.9] : [0.5, 0.9] }} />
            </Stack>
          </AppGate>
        </AppProviders>
      </FontGate>
    </UncaughtErrorGate>
  );
};

export default RootLayout;
