import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ActionButton } from "./ActionButton";

export const ComingSoon = ({ heading, onBrowse }: { heading: string; onBrowse?: () => void }) => {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text role="heading" style={styles.heading}>
          {heading}
        </Text>
        <Text style={styles.notice}>{t("placeholder.comingSoon")}</Text>
        {onBrowse ? <ActionButton label={t("mobileNavigation.browse")} onPress={onBrowse} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: theme.spacing.large },
    heading: { fontSize: theme.typography.title.size, fontWeight: theme.weights.bold, color: colors.foreground },
    notice: { marginTop: theme.spacing.small, fontSize: theme.typography.body.size, color: colors["muted-foreground"] },
  });
};
