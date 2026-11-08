import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import type { Locale } from "@kalia/locales";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { I18nextProvider, useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "@/components/ActionButton";
import { BuildInfo } from "@/components/BuildInfo";
import { ErrorReference } from "@/components/ErrorReference";
import { createI18n } from "@/lib/i18n/createI18n";
import { scrub } from "@/lib/log/deviceLog";

const Content = ({ error, onRestart }: { error: Error; onRestart: () => void }) => {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen}>
      <Text role="heading" style={styles.title}>
        {t("error.title")}
      </Text>
      <Text style={styles.body}>{t("error.crash.body")}</Text>
      {__DEV__ ? <Text style={styles.detail}>{scrub(error.message)}</Text> : null}
      <ErrorReference error={error} />
      <BuildInfo />
      <ActionButton label={t("error.crash.restart")} onPress={onRestart} />
    </SafeAreaView>
  );
};

/**
 * Renders outside the app's providers, which the error may have come from, so
 * it brings its own translations.
 */
export const CrashScreen = ({ locale, error, onRestart }: { locale: Locale; error: Error; onRestart: () => void }) => {
  const [i18n] = useState(() => createI18n(locale));

  return (
    <I18nextProvider i18n={i18n}>
      <Content error={error} onRestart={onRestart} />
    </I18nextProvider>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, justifyContent: "center", padding: theme.spacing.large, backgroundColor: colors.background },
    title: { fontSize: theme.typography.title.size, fontWeight: theme.weights.bold, color: colors.foreground },
    detail: { marginTop: theme.spacing.small, fontSize: theme.typography.label.size, color: colors.destructive },
    body: { marginTop: theme.spacing.small, fontSize: theme.typography.body.size, color: colors["muted-foreground"] },
  });
};
