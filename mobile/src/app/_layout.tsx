import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

import { AppGate } from "@/features/app-config";
import { CrashBoundary, installUncaughtErrorHandler, UncaughtErrorGate } from "@/features/crash-recovery";
import { registerMobileTransport } from "@/lib/api/registerTransport";
import { FontGate } from "@/lib/design/FontGate";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useDeviceLocale } from "@/lib/i18n/useDeviceLocale";
import { useReducedMotion, watchReducedMotion } from "@/lib/motion/reducedMotion";
import { AppProviders } from "@/lib/providers/AppProviders";

registerMobileTransport();
void watchReducedMotion();
installUncaughtErrorHandler();

export const unstable_settings = { anchor: "(tabs)" };

export const ErrorBoundary = CrashBoundary;

const RootLayout = () => {
  const locale = useDeviceLocale();
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();

  return (
    <UncaughtErrorGate>
      <FontGate>
        <AppProviders locale={locale}>
          <StatusBar style="auto" />
          <AppGate>
            <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "fade" : "default", contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="add-sheet" options={{ presentation: "formSheet", sheetAllowedDetents: Platform.select({ android: [0.9], default: [0.5, 0.9] }) }} />
              <Stack.Screen name="filters-sheet" options={{ presentation: "formSheet", sheetAllowedDetents: [0.95] }} />
              <Stack.Screen name="beers/[id]" options={{ presentation: "formSheet", sheetAllowedDetents: [0.95] }} />
              <Stack.Screen name="sign-in-sheet" options={{ presentation: "formSheet", sheetAllowedDetents: Platform.select({ android: [0.9], default: [0.5, 0.9] }) }} />
            </Stack>
          </AppGate>
        </AppProviders>
      </FontGate>
    </UncaughtErrorGate>
  );
};

export default RootLayout;
