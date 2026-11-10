import { ActionButton } from "@/components/ActionButton";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const AddActionSheet = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog");
  };
  const browse = () => {
    if (router.canGoBack()) {
      router.dismiss();
      router.navigate("/catalog");
    } else {
      router.replace("/catalog");
    }
  };
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: theme.spacing.large },
    heading: { marginTop: theme.spacing.medium, fontSize: theme.typography.title.size, fontWeight: theme.weights.bold, color: colors.foreground },
    body: { marginTop: theme.spacing.medium, fontSize: theme.typography.body.size, color: colors.foreground },
  });

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ActionButton label={t("mobileNavigation.close")} onPress={close} />
        <Text role="heading" style={styles.heading}>{t("mobileNavigation.addTitle")}</Text>
        <Text style={styles.body}>{t("mobileNavigation.scanComingSoon")}</Text>
        <ActionButton label={t("mobileNavigation.browse")} onPress={browse} />
      </ScrollView>
    </SafeAreaView>
  );
};
