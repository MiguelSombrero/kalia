import { useTranslation } from "react-i18next";
import { ComingSoon } from "@/components/ComingSoon";
import { ActionButton } from "@/components/ActionButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const CellarScreen = () => {
  const { t } = useTranslation();
  const { state } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: theme.spacing.medium },
    heading: { ...textStyle("screen-title", "bold"), color: colors.foreground },
    body: { marginTop: theme.spacing.medium, ...textStyle("body", "normal"), color: colors["muted-foreground"] },
  });

  if (state.status !== "signedIn") {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text role="heading" {...titleScale} style={styles.heading}>{t("nav.cellar")}</Text>
          {state.status === "signedOut" ? (
            <>
              <Text style={styles.body}>{t("mobileNavigation.cellarInvitation")}</Text>
              <Text style={styles.body}>{t("placeholder.comingSoon")}</Text>
              <ActionButton label={t("profile.signIn.action")} onPress={() => router.push("/sign-in-sheet")} />
              <ActionButton label={t("mobileNavigation.browse")} onPress={() => router.navigate("/catalog")} variant="secondary" />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return <ComingSoon heading={t("nav.cellar")} onBrowse={() => router.navigate("/catalog")} />;
};
