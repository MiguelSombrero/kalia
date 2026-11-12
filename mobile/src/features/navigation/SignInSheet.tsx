import { ActionButton } from "@/components/ActionButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const SignInSheet = () => {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog");
  };
  const start = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = await signIn(i18n.language);
      if (!mounted.current) return;
      if (result === "signedIn") close();
      if (result === "failed") setFailed(true);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: theme.spacing.medium },
    heading: { marginTop: theme.spacing.medium, ...textStyle("item-title", "bold"), color: colors.foreground },
    body: { marginTop: theme.spacing.medium, ...textStyle("body", "normal"), color: colors.foreground },
    notice: { marginTop: theme.spacing.medium, ...textStyle("body", "normal"), color: colors.destructive },
  });

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ActionButton label={t("mobileNavigation.close")} onPress={close} busy={busy} variant="secondary" />
        <Text role="heading" style={styles.heading}>{t("profile.signIn.action")}</Text>
        <Text style={styles.body}>{t("mobileNavigation.signInHint")}</Text>
        {failed ? <Text style={styles.notice}>{t("session.signInFailed")}</Text> : null}
        <ActionButton label={t("profile.signIn.action")} onPress={() => void start()} busy={busy} />
      </ScrollView>
    </SafeAreaView>
  );
};
