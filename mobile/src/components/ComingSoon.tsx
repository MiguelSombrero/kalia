import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export const ComingSoon = ({ heading }: { heading: string }) => {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text role="heading" style={styles.heading}>
        {heading}
      </Text>
      <Text style={styles.notice}>{t("placeholder.comingSoon")}</Text>
    </SafeAreaView>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, padding: theme.spacing.large, backgroundColor: colors.background },
    heading: { fontSize: theme.typography.title.size, fontWeight: theme.weights.bold, color: colors.foreground },
    notice: { marginTop: theme.spacing.small, fontSize: theme.typography.body.size, color: colors["muted-foreground"] },
  });
};
