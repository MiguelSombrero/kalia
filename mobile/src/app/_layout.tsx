import { resolveLocale } from "@/lib/i18n/resolveLocale";
import { registerMobileTransport } from "@/lib/api/registerTransport";
import { AppProviders } from "@/lib/providers/AppProviders";
import { useLocales } from "expo-localization";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

registerMobileTransport();

const RootLayout = () => {
  const locales = useLocales();

  return (
    <AppProviders locale={resolveLocale(locales.map((locale) => locale.languageCode))}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
};

export default RootLayout;
