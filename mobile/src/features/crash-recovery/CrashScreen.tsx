import type { Locale } from "@kalia/locales";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { BuildInfo } from "@/components/BuildInfo";
import { ErrorReference } from "@/components/ErrorReference";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { createI18n } from "@/lib/i18n/createI18n";
import { scrub } from "@/lib/log/deviceLog";

type CrashScreenProps = { locale: Locale; error: Error; onRestart: () => void };

/**
 * Renders outside the app's providers, which the error may have come from, so
 * it brings its own translations.
 */
export const CrashScreen = ({ locale, error, onRestart }: CrashScreenProps) => {
  const styles = useStyles();
  const [i18n] = useState(() => createI18n(locale));

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.about}>
            <View style={styles.copy}>
              <Text role="heading" {...titleScale} style={styles.title}>
                {i18n.t("error.title")}
              </Text>
              <Text style={styles.body}>{i18n.t("error.crash.body")}</Text>
              {__DEV__ ? <Text style={styles.detail}>{scrub(error.message)}</Text> : null}
              <ErrorReference error={error} />
            </View>
            <BuildInfo />
          </View>
          <ActionButton label={i18n.t("error.crash.restart")} onPress={onRestart} />
        </ScrollView>
      </SafeAreaView>
    </I18nextProvider>
  );
};

const useStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", gap: theme.spacing.large, padding: theme.spacing.medium },
  about: { gap: theme.spacing.xlarge },
  copy: { gap: theme.spacing.small },
  title: { ...textStyle("screen-title", "bold"), color: colors.foreground },
  detail: { ...textStyle("label", "normal"), color: colors.destructive },
  body: { ...textStyle("body", "normal"), color: colors["muted-foreground"] },
}));
